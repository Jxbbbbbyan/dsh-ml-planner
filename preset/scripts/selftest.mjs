/**
 * router-planner self-test — 在不启动 DSH 宿主的前提下，用真实 Node 模块加载
 * 本预设的两个本地模块，验证：
 *
 *   1. core 的分类 / 引导 / 会话日志读取在当前 DSH Session API（`seq` /
 *      `eventAt`）与旧版 `events` 数组下都成立；
 *   2. bootstrap 的 `system-prompt/assemble` 监听器能完成一次 assembly
 *      （修复前这里会抛 "Cannot read properties of undefined (reading 'find')"，
 *      导致会话连一轮都跑不起来），并按行为带裁剪首轮工具面、保留 persona；
 *   3. 首次持久 tool/call 之后放开完整工具目录；
 *   4. `session/event` 引导注入在**首条**用户消息上就生效；
 *   5. lib/plan-subagents.js 注册 `run_plan_subagent`，并以只读 deny 列表
 *      调用宿主 `subagents` 注册表。
 *
 * 用法：node scripts/selftest.mjs
 * 退出码 0 = 全部通过。
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const preset = join(here, '..')

const core = await import(new URL('../router-planner-core.mjs', import.meta.url).href)
const bootstrap = await import(new URL('../router-planner-bootstrap.mjs', import.meta.url).href)

let failures = 0
const ok = (label, condition, detail) => {
  if (condition) {
    console.log(`  PASS  ${label}`)
  } else {
    failures += 1
    console.log(`  FAIL  ${label}${detail === undefined ? '' : ` — ${detail}`}`)
  }
}
const section = (title) => console.log(`\n== ${title} ==`)

// ── 夹具 ────────────────────────────────────────────────────────────────────

/** 当前 DSH 的 Session 形状：seq + eventAt，无 events 数组。 */
function newApiSession(id) {
  const events = []
  return {
    id,
    get seq() { return events.length },
    eventAt(seq) { return events[seq] },
    snapshotEvents() { return events.slice() },
    append(type, data) { const event = { type, data, seq: events.length, time: 0 }; events.push(event); return event },
  }
}

/** 旧版 Session 形状：events 数组。 */
function legacySession(id, events) {
  return { id, events }
}

const userEvent = (text) => ({
  type: 'user/message',
  data: { id: `m-${text.length}`, role: 'user', content: [{ type: 'text', text }], source: { kind: 'user' } },
})

const FULL_CATALOG = [
  'read', 'write', 'edit', 'glob', 'grep', 'pwsh', 'skill', 'ask_user_question', 'todo_write',
  'create_goal', 'get_goal', 'update_goal', 'run_plan_subagent', 'web_search', 'web_fetch',
  'job_list', 'job_output', 'job_kill', 'subagent', 'subagent_fork', 'send_message',
  'interrupt_agent', 'list_agents', 'workflow', 'ralph', 'dev_router_status', 'dev_router_mode',
  'dev_mode_subagent',
].map((name) => ({ name, description: name, parameters: { type: 'object', properties: {} } }))

function makeAssembly() {
  return {
    sections: [{ name: 'persona', text: 'planning-first persona' }, { name: 'instructions', text: 'x' }],
    contexts: [{ name: 'cwd', text: '/tmp' }],
    tools: FULL_CATALOG.map((tool) => ({ ...tool })),
    variables: {},
  }
}

/** 最小 ctx 替身：记录监听器、工具注册与 effect。 */
function makeCtx(registry) {
  const listeners = new Map()
  const registeredTools = []
  const ctx = {
    on(event, handler) { listeners.set(event, handler); return () => listeners.delete(event) },
    get(name) { return name === 'agents' ? registry : undefined },
    effect(callback) { const disposer = callback(); return () => { if (typeof disposer === 'function') disposer() } },
    tools: { register(definition) { registeredTools.push(definition); return () => {} } },
  }
  return { ctx, listeners, registeredTools }
}

function makeHarness(routerMode, message) {
  const session = newApiSession('s-1')
  const agent = {
    id: session.id,
    session,
    options: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' },
    inbox: { appended: [], append(target, payload) { this.appended.push({ target, payload }) } },
  }
  const registry = { get: (id) => (id === session.id ? agent : undefined) }
  const { ctx, listeners, registeredTools } = makeCtx(registry)
  bootstrap.apply(ctx, { routerMode })
  if (message !== undefined) listeners.get('session/event')(session, userEvent(message))
  return { session, agent, listeners, registeredTools, registry }
}

const assemble = async (listeners, agent) =>
  listeners.get('system-prompt/assemble')(null, { agent, scope: agent }, async () => makeAssembly())

/**
 * Drive one `agent/pre-step` waterfall pass. The router stages guidance in the
 * `session/event` observer and delivers it here, because writing the inbox
 * during a session append is rejected as re-entrant.
 */
const preStep = (listeners, agent, messages) => {
  const handler = listeners.get('agent/pre-step')
  if (handler === undefined) return undefined
  return handler(
    { agent, messages, turn: 1, step: 1, signal: new AbortController().signal },
    async () => ({ kind: 'enter', messages: [...messages] }),
  )
}
const guideTexts = (decision) => (Array.isArray(decision?.messages) ? decision.messages : [])
  .filter((message) => message?.source?.kind === 'plugin' && message.source.plugin === 'router-planner-bootstrap')
  .map((message) => message.content.map((block) => block.text ?? '').join(''))

// ── 1. core：分类与引导 ─────────────────────────────────────────────────────
section('core: classification and guidance')
ok('build request → react band', core.classifyTask('帮我写一个网页贪吃蛇游戏') === 1, String(core.classifyTask('帮我写一个网页贪吃蛇游戏')))
ok('fix request → spec band', core.classifyTask('修复登录报错') === 0, String(core.classifyTask('修复登录报错')))
ok('ambiguous request → weak band', core.classifyTask('嗯') === 'weak')
ok('empty request → weak band', core.classifyTask('') === 'weak')
ok('planner guide covers react', /build task — plan lean/.test(core.guideForPlanner(1, '写个页面') ?? ''))
ok('planner guide covers spec', /fix\/maintenance task — plan first/.test(core.guideForPlanner(0, '修一下报错') ?? ''))
ok('planner guide covers weak', /classify this task/.test(core.guideForPlanner('weak', '嗯') ?? ''))
ok('transition band injects nothing', core.guideForPlanner(0.3, '嗯') === null)

// ── 2. core：两种 Session API 下的日志读取 ─────────────────────────────────
section('core: session log reading (new API + legacy shape)')
const newSession = newApiSession('s-new')
newSession.append('user/message', userEvent('修复登录报错').data)
ok('sessionMode reads new-API session', core.sessionMode(newSession) === 0, String(core.sessionMode(newSession)))
ok('firstUserTextOf reads new-API session', core.firstUserTextOf(newSession) === '修复登录报错')
const legacy = legacySession('s-legacy', [userEvent('帮我写一个网页贪吃蛇游戏')])
ok('sessionMode reads legacy events array', core.sessionMode(legacy) === 1, String(core.sessionMode(legacy)))
ok('sessionMode tolerates an eventless session', core.sessionMode(newApiSession('s-empty')) === 'weak')
ok('sessionMode tolerates a malformed session', core.sessionMode({ id: 's-bad' }) === 'weak')
ok('sessionMode tolerates undefined', core.sessionMode(undefined) === 'weak')

const tracker = core.createToolCallTracker()
const tracked = newApiSession('s-track')
ok('tracker: no tool call yet', tracker(tracked) === false)
tracked.append('tool/call', { turn: 1, step: 1, callId: 'c1', name: 'read', arguments: '{}' })
ok('tracker: sees the appended tool call', tracker(tracked) === true)
ok('tracker: stays true afterwards', tracker(tracked) === true)

// ── 3. bootstrap：规划 persona 保留 + 分带工具面 ───────────────────────────
section('bootstrap: planner assembly by behavior band')

const buildRun = makeHarness('planner', '帮我写一个网页贪吃蛇游戏')
const buildAssembly = await assemble(buildRun.listeners, buildRun.agent)
const buildTools = buildAssembly.tools.map((tool) => tool.name).sort()
ok('build: assembly completes (no throw)', Array.isArray(buildAssembly.tools))
ok('build: tool face = read/write/edit ∪ skill/ask_user_question ∪ pwsh',
  JSON.stringify(buildTools) === JSON.stringify(['ask_user_question', 'edit', 'pwsh', 'read', 'skill', 'write']),
  buildTools.join(','))
ok('build: planning persona preserved', buildAssembly.sections.some((s) => s.name === 'persona' && s.text === 'planning-first persona'))
ok('build: runtime contexts dropped on the narrowed turn', buildAssembly.contexts.length === 0)
const buildStep = await preStep(buildRun.listeners, buildRun.agent, [userEvent('帮我写一个网页贪吃蛇游戏').data])
ok('build: guide delivered by the pre-step waterfall',
  guideTexts(buildStep).some((text) => /build task — plan lean/.test(text)), JSON.stringify(guideTexts(buildStep)))
ok('build: guide carries the plugin notice source shape',
  (buildStep?.messages ?? []).some((m) => m.source?.kind === 'plugin' && m.source?.form === 'notice'))
ok('build: guide is delivered once, not on every step',
  guideTexts(await preStep(buildRun.listeners, buildRun.agent, [userEvent('again').data])).length === 0)
ok('build: the session/event observer never re-enters the session append',
  buildRun.agent.inbox.appended.length === 0, JSON.stringify(buildRun.agent.inbox.appended))

const fixRun = makeHarness('planner', '修复登录报错')
const fixTools = (await assemble(fixRun.listeners, fixRun.agent)).tools.map((tool) => tool.name).sort()
ok('fix: tool face = read/edit/glob/grep ∪ skill/ask_user_question ∪ pwsh',
  JSON.stringify(fixTools) === JSON.stringify(['ask_user_question', 'edit', 'glob', 'grep', 'pwsh', 'read', 'skill']),
  fixTools.join(','))
ok('fix: guide asks for a plan artifact first',
  guideTexts(await preStep(fixRun.listeners, fixRun.agent, [userEvent('修复登录报错').data]))
    .some((text) => /fix\/maintenance task — plan first/.test(text)))

const weakRun = makeHarness('planner', '嗯')
const weakTools = (await assemble(weakRun.listeners, weakRun.agent)).tools.map((tool) => tool.name).sort()
ok('weak: tool face keeps the planning core',
  weakTools.includes('skill') && weakTools.includes('ask_user_question') && weakTools.includes('pwsh'),
  weakTools.join(','))
ok('weak: guide asks the model to classify the task',
  guideTexts(await preStep(weakRun.listeners, weakRun.agent, [userEvent('嗯').data]))
    .some((text) => /classify this task/.test(text)))

const rejectedRun = makeHarness('planner', '帮我写一个网页贪吃蛇游戏')
const rejected = await rejectedRun.listeners.get('agent/pre-step')(
  { agent: rejectedRun.agent, messages: [], turn: 1, step: 1, signal: new AbortController().signal },
  async () => ({ kind: 'reject' }),
)
ok('rejected pre-step decision passes through untouched', rejected.kind === 'reject')

const coldRun = makeHarness('planner')
const coldAssembly = await assemble(coldRun.listeners, coldRun.agent)
ok('cold session (no user message yet) assembles without throwing', Array.isArray(coldAssembly.tools))

// ── 4. bootstrap：首次 tool/call 之后放开完整目录 ──────────────────────────
section('bootstrap: promotion after the first tool call')
buildRun.session.append('tool/call', { turn: 1, step: 1, callId: 'c1', name: 'read', arguments: '{}' })
const promoted = await assemble(buildRun.listeners, buildRun.agent)
ok('promoted: full catalog restored', promoted.tools.length === FULL_CATALOG.length, `${promoted.tools.length} vs ${FULL_CATALOG.length}`)
ok('promoted: persona still preserved', promoted.sections.some((s) => s.name === 'persona'))

// ── 5. bootstrap：dev_* 工具注册 ───────────────────────────────────────────
section('bootstrap: registered dev tools')
const devNames = buildRun.registeredTools.map((tool) => tool.name).sort()
ok('dev_router_status registered', devNames.includes('dev_router_status'), devNames.join(','))
ok('dev_router_mode registered', devNames.includes('dev_router_mode'))
ok('dev_mode_subagent registered', devNames.includes('dev_mode_subagent'))
const statusTool = buildRun.registeredTools.find((tool) => tool.name === 'dev_router_status')
ok('dev_router_status reports planner mode', /router-mode=planner/.test(String(await statusTool.execute({}))))

// ── 6. lib/plan-subagents.js：只读评审子代理工具 ───────────────────────────
section('lib/plan-subagents.js: run_plan_subagent')
const planSubagents = (await import(new URL('../lib/plan-subagents.js', import.meta.url).href)).default
ok('module default export present', planSubagents !== undefined && typeof planSubagents.apply === 'function')

const subagentCalls = []
const subagentCtx = {
  tools: { register(definition) { subagentCtx.registered = definition; return () => {} } },
  subagents: {
    async start(provider, request) {
      subagentCalls.push({ provider, request })
      return {
        id: 'child-1',
        localAgent: undefined,
        result: Promise.resolve({ output: [{ type: 'text', text: 'review findings' }], stopReason: 'completed' }),
        dispose: async () => {},
      }
    },
  },
}
planSubagents.apply(subagentCtx, { toolName: 'run_plan_subagent', provider: 'spawn', deny: ['write', 'edit', 'subagent'] })
ok('registers run_plan_subagent', subagentCtx.registered?.name === 'run_plan_subagent')
ok('tool declares description/prompt parameters',
  Object.keys(subagentCtx.registered.parameters.properties).sort().join(',') === 'description,model,prompt')

const parent = { id: 'session-parent' }
const report = await subagentCtx.registered.execute(
  { description: 'reviewer round 1', prompt: 'review PLAN_v1.md', model: 'deepseek-v4-pro' },
  { agent: parent, signal: new AbortController().signal },
)
ok('returns the child final report', report === 'review findings', String(report))
ok('calls the spawn provider', subagentCalls[0]?.provider === 'spawn')
ok('passes the parent agent', subagentCalls[0]?.request.parent === parent)
ok('passes the read-only deny filter',
  JSON.stringify(subagentCalls[0]?.request.toolFilter) === JSON.stringify({ deny: ['write', 'edit', 'subagent'] }),
  JSON.stringify(subagentCalls[0]?.request.toolFilter))
ok('passes the confirmed model selector', subagentCalls[0]?.request.agentOptions?.model === 'deepseek-v4-pro')

// ── 结果 ────────────────────────────────────────────────────────────────────
console.log('')
if (failures > 0) {
  console.error(`router-planner self-test FAILED: ${failures} check(s) failed`)
  process.exitCode = 1
} else {
  console.log('router-planner self-test OK: all checks passed')
}
