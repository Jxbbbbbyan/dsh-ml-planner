/**
 * router-planner-bootstrap: 智能规划模式——智能路由 × dsh-plans 规划工作流。
 *
 * 融合设计（三个关键决策，均有实测依据）：
 *   1. 不替换 persona。dsh-plans 的规划纪律（选技能 → 出工件 → 评审 →
 *      交接 → goal 执行）由 persona 驱动；论文实测"一句话换人设即可翻转
 *      轨迹"，若用行为带一句话人设替换它会毁掉整个规划工作流。因此
 *      planner 模式下 sections 原样保留，路由只做两件事：近距离引导 + 首轮
 *      工具面裁剪。
 *   2. 首轮工具面 = 行为带核心 ∪ {skill, ask_user_question}。规划工作流
 *      首轮就要加载规划技能（create-a-*-plan）与向用户提问（语言/模型/
 *      精化/交接），这两个工具必须进首轮面。
 *   3. 不做 planMode 自动规划。dsh-plans 明确禁用内置 plan mode（工件
 *      规划替代它），"规划"= dsh-plans 的 Markdown 计划工件 + 评审轮 +
 *      显式交接，与内置 plan mode 无关。
 *
 * 路由职责：分类首条用户消息（react/spec/weak），每条真实用户消息后注入
 * 对应行为带的规划向近距离引导（深度自适应）；首轮按带裁剪工具面，首次
 * 持久 tool/call 后放开完整目录。
 *
 * 零外部依赖；工具 schema 用内联最小编译器。
 */

import {
  applyPersona, bandFor, bandOf, classifyTask, coreFor, createToolCallTracker, parseMode, personaFor, sessionMode,
  testinessFor, clamp01, guideForPlanner,
} from './router-planner-core.mjs'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'router-planner-bootstrap'

/** Prompt assembly, the tools registry, and the LLM route must exist. */
export const inject = ['systemPrompt', 'tools', 'llm']

/** Minimal spec → JSON Schema compiler (subset of defineTool's work). */
function toJsonSchema(spec) {
  const properties = {}
  const required = []
  for (const [key, meta] of Object.entries(spec || {})) {
    const prop = { type: meta.type }
    if (Array.isArray(meta.enum)) prop.enum = meta.enum
    if (meta.description) prop.description = meta.description
    properties[key] = prop
    if (meta.required) required.push(key)
  }
  return { type: 'object', properties, required, additionalProperties: false }
}

export function apply(ctx, config) {
  const overrides = new Map() // session id -> explicit mode (number 0..1)
  const agents = new Map() // session id -> Agent (live handle, in-process only)
  // session id -> 首条真实用户消息的**分类结果**（数字或 'weak'）。
  // 注意存的必须是分类结果，不是原始文本：这个 map 的值会被直接当作 mode
  // 使用（bandOf/clamp01），存文本会让每条消息都退化成 spec 带。
  const firstUserMode = new Map()
  // session id -> 本轮待注入的规划向引导文本；由 `agent/pre-step` 消费一次。
  const pendingGuides = new Map()
  // 会话是否已产生持久 tool/call（首轮裁剪 vs 放开完整目录）。旧版直接读
  // `session.events`，当前 DSH 的 Session 没有该数组；改为增量扫描器。
  const hasToolCall = createToolCallTracker()

  // ── 路由模式 ─────────────────────────────────────────────────────────────
  // planner（默认，新增）: 智能规划——不换 persona，三带规划向近距离引导 +
  //   首轮工具面（行为带核心 ∪ skill/ask_user_question）。
  // smart（兼容）: 智能路由（换 persona + 三带引导）。
  // standard / spec（兼容）: 官方两种模式。
  const routerMode = ['smart', 'standard', 'spec'].includes(config.routerMode)
    ? config.routerMode
    : 'planner'
  const RL_PERSONA = 'You are a helpful software engineer assistant.'

  /** spec/standard 路由模式的兼容工具面。 */
  function legacyCore(mode) {
    switch (bandOf(mode)) {
      case 'spec': return ['read', 'edit', 'glob', 'grep']
      default: return ['read', 'write', 'edit']
    }
  }

  /** 规划工作流必需的首轮工具（技能加载 + 用户提问）。 */
  const PLANNING_CORE = ['skill', 'ask_user_question']

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const agent = context.agent
    if (agent === undefined) return assembled
    const session = agent.session
    agents.set(session.id, agent)

    const mode = overrides.get(session.id) ?? firstUserMode.get(session.id) ?? sessionMode(session)
    const modelId = agent.options?.model

    // ── 模式分派 ──
    // planner: sections 原样保留（dsh-plans 规划 persona 是工作流契约），
    //   工具面 = 行为带核心 ∪ 规划必需工具。
    // smart/spec: 分类 persona 替换（applyPersona 只换 persona section）。
    // standard: 首轮 system 只有 RL 训练句。
    const planSection = (assembled.sections || []).find((s) => /plan/i.test(s.name))
    let sections
    let core
    if (routerMode === 'standard') {
      sections = planSection
        ? [planSection, { name: 'router-persona', text: RL_PERSONA, order: 0 }]
        : [{ name: 'router-persona', text: RL_PERSONA, order: 0 }]
      core = new Set(['str_replace_editor']) // RL shape: shell + editor
    } else if (routerMode === 'planner') {
      sections = assembled.sections // 保留 dsh-plans 规划 persona 与全部 sections
      core = new Set([...coreFor(mode), ...PLANNING_CORE])
    } else {
      // smart / spec：分类 persona + 完整 sections
      sections = applyPersona(assembled.sections, personaFor(mode, modelId))
      core = new Set(routerMode === 'spec' ? legacyCore(mode) : coreFor(mode))
    }

    if (hasToolCall(session)) {
      return { ...assembled, sections, contexts: [] } // promoted: full catalog
    }

    const available = new Set(assembled.tools.map((tool) => tool.name))
    const shell = available.has('pwsh') ? 'pwsh' : available.has('bash') ? 'bash' : null
    if (shell === null) {
      throw new Error(`${name}: no platform shell in catalog`)
    }
    core.add(shell)

    return {
      ...assembled,
      sections,
      contexts: [],
      tools: assembled.tools.filter((tool) => core.has(tool.name)),
    }
  })

  // ── 近距离引导（P14/P16/P17/P19/P20）───────────────────────────────────
  // 每条真实用户消息后追加一条固定引导（近场，缓存中立，零衰减）。
  // planner 模式三带全覆盖：react → 精简计划+直接产出；spec → 先查后改
  // 先规划；weak → 自分类。深度自适应：简单任务快收敛，复杂任务深思考。
  //
  // 两级实现，缺一不可：
  //   1. `session/event` 观察者只做**读**：记下首条真实用户消息的分类结果，
  //      并暂存这一轮的引导文本。
  //   2. `agent/pre-step` 瀑布负责**写**：把暂存的引导拼进本步要进入的消息里。
  //
  // 为什么不在观察者里直接 `inbox.append`？`session/event` 的回调运行在
  // 「本次 append 仍在发布中」的窗口内，那里写 inbox 会被
  // `session append cannot reenter while another append is being published`
  // 拒绝；旧代码用裸 `catch {}` 吞掉了这个错误，于是**引导从未真正生效**。
  // `agent/pre-step` 是 stock model-switch notice 使用的同一注入点。
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'user/message') return
    const data = event.data ?? {}
    if (data.source?.kind !== 'user') return // only real user messages
    const text = extractText(data)
    if (!text.trim()) return
    if (!firstUserMode.has(session.id)) {
      // capture the CLASSIFIED mode BEFORE assembly, so the first assembly
      // already routes by band instead of falling back to a log scan.
      firstUserMode.set(session.id, classifyTask(text.trim()))
    }
    const mode = overrides.get(session.id) ?? firstUserMode.get(session.id)
    if (routerMode === 'smart' || routerMode === 'planner') {
      const guide = guideForPlanner(mode, text)
      if (guide !== null) pendingGuides.set(session.id, guide) // transition 带不引导
    } else if (bandOf(mode) === 'weak') {
      // 兼容模式（standard/spec）沿用 stock 行为：仅 weak 带注入引导
      pendingGuides.set(session.id, guideForPlanner('weak', text))
    }
  })

  ctx.on('agent/pre-step', async (payload, next) => {
    const decision = await next()
    if (decision?.kind !== 'enter') return decision
    const sessionId = payload.agent?.session?.id ?? payload.agent?.id
    const guide = sessionId === undefined ? undefined : pendingGuides.get(sessionId)
    if (guide === undefined || decision.messages.length === 0) return decision
    pendingGuides.delete(sessionId)
    return { ...decision, messages: [...decision.messages, guideMessage(guide)] }
  })

  /** 一条 plugin 形态的 near-field 引导消息（与 model-switch notice 同形）。 */
  function guideMessage(text) {
    return {
      id: `router-planner-guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      source: {
        kind: 'plugin',
        plugin: 'router-planner-bootstrap',
        form: 'notice',
        summary: 'router guidance',
      },
      content: [{ type: 'text', text }],
    }
  }

  // ── 路由可见与调优（agent 自优化）───────────────────────────────────────
  const registerTool = (tool) => {
    ctx.effect(() => ctx.tools.register({
      ...tool,
      parameters: toJsonSchema(tool.parameters),
    }))
  }

  const modeSpec = {
    mode: {
      type: 'string',
      required: true,
      description: 'band name (spec / weak / mixed / react), a 0-100 number, a 0.0-1.0 number, or auto to clear the override',
    },
  }

  function fmtMode(mode) {
    return typeof mode === 'string' ? mode : mode.toFixed(2)
  }

  registerTool({
    name: 'dev_router_status',
    description: 'Show this session\'s reasoning-mode routing: mode, band, persona, first-turn core tools, test-suppression, and whether an override is active.',
    parameters: {},
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    execute() {
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      const mode = overrides.get(session.id) ?? firstUserMode.get(session.id) ?? sessionMode(session)
      const modelId = currentAgent()?.options?.model
      return [
        `router-mode=${routerMode} (planner=智能规划 / smart=智能路由 / standard=RL接口还原 / spec=深度思考优先)`,
        `mode=${fmtMode(mode)} (band=${bandFor(mode)})`,
        `persona=${routerMode === 'planner' ? 'dsh-plans planning-first (preserved)' : personaFor(mode, modelId).replace(/\n/g, ' / ')}`,
        `core=[${[...coreFor(mode), ...(routerMode === 'planner' ? PLANNING_CORE : [])].join(', ')}]`,
        `testiness=${testinessFor(mode)}`,
        `override=${overrides.has(session.id) ? 'yes' : 'no'}`,
      ].join('\n')
    },
  })

  registerTool({
    name: 'dev_router_mode',
    description: 'Set this session\'s reasoning mode: spec (plan-first) / weak (internal routing, model decides per task) / mixed (transition, trap) / react (doer). Accepts band names, 0-100, or 0.0-1.0; use auto to return to task classification. The next request applies it.',
    parameters: modeSpec,
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    execute(args) {
      const parsed = parseMode(args.mode)
      if (parsed === null) return `invalid mode "${args.mode}": use spec/weak/mixed/react, 0-100, 0.0-1.0, or auto`
      const session = currentSession()
      if (session === undefined) return 'no agent session'
      if (parsed === 'auto') overrides.delete(session.id)
      else overrides.set(session.id, parsed === 'weak' ? 'weak' : clamp01(parsed))
      const current = overrides.get(session.id) ?? sessionMode(session)
      return `mode=${fmtMode(current)} (band=${bandFor(current)}) — next request applies`
    },
  })

  // ── 模式隔离子代理：在另一个推理模式跑一个任务，不动当前轨迹 ────────────
  registerTool({
    name: 'dev_mode_subagent',
    description: 'Run one task in a DIFFERENT reasoning mode than this session, in a fresh isolated context (own system prompt). The current session trajectory is untouched. Mode: spec (plan-first) / weak (internal routing) / react (doer) / balanced. Returns the subagent\'s answer text.',
    parameters: {
      mode: { type: 'string', required: true, description: 'spec / weak / react / balanced (or 0-100)' },
      task: { type: 'string', required: true, description: 'the task to hand to the mode-isolated subagent' },
      maxTokens: { type: 'number', description: 'output cap (default 1024)' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const parsed = parseMode(args.mode)
      if (parsed === null || parsed === 'auto') return `invalid mode "${args.mode}"`
      const session = currentSession()
      const agent = session === undefined ? undefined : [...agents.values()].find((a) => a.session === session)
      if (agent === undefined || agent.options === undefined) return 'no agent route available'
      const { provider, model } = agent.options
      if (!provider || !model) return 'agent route missing provider/model'

      const persona = personaFor(parsed, model)
      const maxTokens = Number(args.maxTokens || 1024)
      let text = ''
      let reasoningChars = 0
      try {
        const stream = ctx.llm.stream({
          provider,
          model,
          system: persona,
          messages: [{ role: 'user', content: [{ type: 'text', text: String(args.task) }] }],
          maxTokens,
        })
        for await (const chunk of stream) {
          if (chunk.type === 'text-delta') text += chunk.text
          else if (chunk.type === 'reasoning-delta') reasoningChars += chunk.text.length
        }
      } catch (error) {
        return `subagent error: ${error && error.message ? error.message : String(error)}`
      }
      const head = text.slice(0, 3000)
      return `[mode-subagent ${bandFor(parsed)} | reasoning ${reasoningChars} chars]\n${head}${text.length > 3000 ? '\n…(truncated)' : ''}`
    },
  })

  function currentSession() {
    const agent = ctx.get('agent')
    if (agent !== undefined && agent.session !== undefined) return agent.session
    const last = [...agents.values()].at(-1)
    return last?.session
  }

  function currentAgent() {
    const session = currentSession()
    return session === undefined ? undefined : [...agents.values()].find((a) => a.session === session)
  }

  function extractText(data) {
    if (!data) return ''
    const payload = data && typeof data.message === 'object' && data.message !== null ? data.message : data
    const content = Array.isArray(payload.content) ? payload.content : []
    return content.map((c) => (typeof c === 'string' ? c : (c.text ?? ''))).join(' ')
  }
}
