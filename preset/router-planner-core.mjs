/**
 * router-planner-core: 智能规划核心（零依赖）——router-smart-core 的规划增强版。
 *
 * 在智能路由（smart）基础上叠加"规划优先"行为：所有行为带的近距离引导
 * 都是规划向（plan-first）——先出方案/先查清现状，再实施；规划工作流本身
 * 由 dsh-plans 预设提供（技能 + 工件 + 评审轮 + goal 执行），路由不干预。
 * persona 保持各带实测最优文本不动（一句话换人设就能翻转轨迹，论文实测），
 * 规划意图全部走近距离引导实现，不污染人设吸引子。
 */

export const MODE_SPEC = 0
export const MODE_MIXED = 0.3
export const MODE_REACT = 1
export const MODE_WEAK = 'weak'
/** ml-planner: 正交的 ML 触发（不进入 bandOf，避免 clamp01('ml')=0 被误判为 spec 带）。 */
export const MODE_ML = 'ml'

// ── ml-planner：ML 词表加载（I-012a/I-012）─────────────────────────────────
// 单一来源 = ./lib/ml-keywords.json，用 import.meta.url 相对解析（C-015：不得用 cwd
// 相对路径，否则真实会话里永远读不到、内置兜底恒胜、S-003 的"唯一来源"空洞通过）。
// 零抛错（C-010）：词表位于 system-prompt assembly 热路径上，抛错会让整个会话无法
// 产生任何一轮。读不到或解析失败 ⇒ 回退到下面已嵌入的词表。
const EMBEDDED_ML_TERMS = [
  '过拟合','欠拟合','泛化能力','正则化','交叉验证','网格搜索','随机搜索','超参数','调参',
  '特征工程','特征选择','标签泄漏','数据泄漏','样本不平衡','损失函数','梯度下降','反向传播',
  '学习率','批量大小','模型评估','混淆矩阵','训练集','验证集','测试集','基线模型','机器学习',
  '深度学习','神经网络','随机森林','决策树','支持向量机','逻辑回归','线性回归','聚类','降维',
  '集成学习','时序预测','可解释性','特征重要性','交叉熵','标签平滑','微调','预训练','大模型',
  '学习曲线','独热编码','标准化','平稳性','滞后特征','过采样','欠采样','拟合','标签编码','残差',
  '均方误差','准确率','召回率','精确率','特征缩放','数据增强','类不平衡','阈值调','²','网络',
  '性能指标','测试效果',
  '\\bmachine learning\\b','\\bdeep learning\\b','\\bneural network','\\boverfitt?ing\\b',
  '\\bunderfitt?ing\\b','\\bregulariz(e|ation)\\b','\\bcross[- ]?validation\\b','\\bhyperparameter',
  '\\bgrid search\\b','\\brandom search\\b','\\bfeature engineering\\b','\\bfeature selection\\b',
  '\\bdata leakage\\b','\\blabel leakage\\b','\\bclass imbalance\\b','\\bloss function\\b',
  '\\bgradient descent\\b','\\bbackpropagation\\b','\\blearning rate\\b','\\bbatch size\\b',
  '\\brec[eo]mmend','\\btrain[/ -]?test split\\b','\\bvalidation set\\b','\\broc[- ]?auc\\b',
  '\\bconfusion matrix\\b','\\bf1[- ]?score\\b','\\bbaseline model\\b','\\brandom forest\\b',
  '\\bxgboost\\b','\\blightgbm\\b','\\bscikit[- ]?learn\\b','\\bsklearn\\b','\\bpytorch\\b',
  '\\btensorflow\\b','\\bk-means\\b','\\bshap values?\\b','\\bpermutation importance\\b',
  '\\bpartial dependence\\b','\\bmodel calibration\\b','\\bsmote\\b','\\bone[- ]hot\\b',
  '\\bshap\\b','\\br2[- ]?score\\b','\\bmean squared error\\b','\\bsilhouette\\b','\\bboosting\\b',
  '\\bbagging\\b','\\bearly stopping\\b','\\bdata augmentation\\b','\\bembedding layer\\b',
  '\\bgradient boosting\\b','\\bthreshold tuning\\b',
]

let mlKeywordsCache
function loadMlKeywords() {
  if (mlKeywordsCache !== undefined) return mlKeywordsCache
  let terms = EMBEDDED_ML_TERMS
  try {
    const fs = process.getBuiltinModule('node:fs')
    const raw = fs.readFileSync(new URL('./lib/ml-keywords.json', import.meta.url), 'utf8')
    const parsed = JSON.parse(raw)
    const loaded = []
    // 只用 `terms` 组 —— `ambiguous` 按 guard 规则**不得单独触发**（Risk-009）。
    for (const e of parsed?.terms ?? []) {
      if (e && typeof e.pattern === 'string' && e.pattern.length > 0) loaded.push(e.pattern)
    }
    if (loaded.length > 0) terms = loaded
  } catch {
    // 零抛错：任何失败都静默回退到内置词表（C-010）。
  }
  mlKeywordsCache = { terms }
  return mlKeywordsCache
}

/** selftest 用：词集（用于三方漂移断言：json ↔ 内置兜底 ↔ md 镜像）。 */
export function mlKeywordTerms() {
  return [...loadMlKeywords().terms]
}

const mlRegexCache = new Map()
function mlHit(text, pattern) {
  let rx = mlRegexCache.get(pattern)
  if (rx === undefined) {
    try {
      rx = new RegExp(pattern, 'i')
    } catch {
      rx = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    }
    mlRegexCache.set(pattern, rx)
  }
  return rx.test(text)
}

/**
 * ml-planner：判断文本是否应触发 ML 块。
 * guard 规则：terms 命中 >= 1 才判定 ML；仅命中 ambiguous 时**不改行为带**（S-001）。
 * 判定是正交的 —— 不返回值进入 bandOf，故既有 react/spec/weak 分带逐值等价。
 */
export function isMlText(text) {
  if (typeof text !== 'string' || !text.trim()) return false
  const { terms } = loadMlKeywords()
  for (const pattern of terms) if (mlHit(text, pattern)) return true
  return false
}

const SPEC_PERSONA = 'You are a helpful software engineer assistant.'

const MIXED_PERSONA =
  'You are a helpful software engineer assistant.\n'
  + 'Work directly: prefer writing or editing code over describing plans. '
  + 'Verify your changes by reading and running them.'

const REACT_PERSONA =
  'You are a hands-on software engineer who delivers working output fast.\n'
  + 'Work directly: write or edit code, then verify it by reading and running. '
  + 'Keep the loop tight — produce, verify, fix — and do not build test '
  + 'harnesses, scaffolding, or ceremony the user did not ask for. '
  + 'Finish with a usable deliverable and a short summary.'

/** Weak（内路由）人设——按模型选最优（P11/P24）。 */
const WEAK_PRO =
  'You are a helpful software engineer assistant.\n'
  + 'Before acting, decide the task type (build or fix) and adopt the matching '
  + 'style: build → hands-on production; fix → inspect-and-plan.'

const WEAK_FLASH =
  'You are a helpful assistant.\n'
  + 'Before acting, decide the task type (build or fix) and adopt the matching '
  + 'style: build → hands-on production; fix → inspect-and-plan.\n'
  + 'Before acting, briefly review what you have already done in this session and continue from where you left off; do not repeat completed steps. Do not run environment checks (echo, whoami, uname, node --version, date) or exhaustive grep/glob scans.\n'
  + 'Think deeply first, then produce.'

/** 复杂度启发：长文本或架构性措辞 = 复杂任务。 */
const COMPLEX_RE = /(重构|架构|全面|详细|设计|系统|优化|分析|survey|overview|architecture|refactor|comprehensive|detailed|design|system|optimize|analyze)/i

export function isComplexTask(text) {
  return typeof text === 'string' && (text.length > 120 || COMPLEX_RE.test(text))
}

/** True when the routed model id is a Flash-family model. */
export function isFlashModel(modelId) {
  return typeof modelId === 'string' && /flash/i.test(modelId)
}

/** 量化模式到四个实测行为带之一。 */
export function bandOf(mode) {
  if (mode === 'weak') return 'weak'
  const m = clamp01(mode)
  if (m < 0.2) return 'spec'
  if (m < 0.5) return 'transition'
  return 'react'
}

/** 模式的 persona；weak 按模型选内路由文本。 */
export function personaFor(mode, modelId) {
  switch (bandOf(mode)) {
    case 'spec': return SPEC_PERSONA
    case 'transition': return MIXED_PERSONA
    case 'weak': return isFlashModel(modelId) ? WEAK_FLASH : WEAK_PRO
    default: return REACT_PERSONA
  }
}

/** 首轮核心工具（shell 与 exit_plan_mode 由插件动态追加）。 */
export function coreFor(mode) {
  switch (bandOf(mode)) {
    case 'spec': return ['read', 'edit', 'glob', 'grep'] // read-first
    case 'transition': return ['read', 'edit', 'write', 'glob', 'grep'] // union
    case 'weak': return ['str_replace_editor'] // RL shape: shell + editor
    default: return ['read', 'write', 'edit'] // write-first
  }
}

/** 人类可读带名。 */
export function bandFor(mode) {
  const b = bandOf(mode)
  return b === 'transition' ? 'mixed' : b
}

/** 测试抑制强度（信息性）。 */
export function testinessFor(mode) {
  switch (bandOf(mode)) {
    case 'react': return 'suppressed'
    case 'spec': return 'normal'
    default: return 'light'
  }
}

// ── 智能分类器（与 router-smart 相同：扩充关键词，中英双语）────────────────
const REACT_RE = /(开发|创建|写一个|写个|写一个|生成|从零|做一个|做个|游戏|网页|网站|构建|新项目|搭建|实现|做出|上线|落地|脚本|工具|应用|原型|初始化|启动|建个|做点|写点|接口|页面|功能|模块|build|create|develop|generate|implement|make a|new project|scaffold|bootstrap|init|prototype|feature|module|page|website|game|app|tool)/gi
const SPEC_RE = /(修复|修一下|调试|重构|维护|排查|报错|出错|崩溃|优化|审查|为什么|异常|故障|迁移|升级|兼容|分析|设计|计划|规划|评估|调研|验证|解释|检查|问题|bug|fix|debug|refactor|maintain|repair|broken|break|analyze|design|plan|audit|migrate|upgrade|compatible|investigate|troubleshoot|review|explain|why|issue|error|crash)/gi

function countHits(regex, text) {
  return [...text.matchAll(regex)].length
}

/**
 * 分类任务文本到模式。明确关键词证据选稳定带；平局或未匹配 → 'weak'。
 */
export function classifyTask(text) {
  if (typeof text !== 'string' || !text.trim()) return 'weak'
  const react = countHits(REACT_RE, text)
  const spec = countHits(SPEC_RE, text)
  if (react > spec && react >= 1) return 1
  if (spec > react && spec >= 1) return 0
  return 'weak'
}

// ── 会话日志读取（版本兼容）────────────────────────────────────────────────
// 当前 DSH 的 `Session` 类只暴露 `seq` / `eventAt(seq)` / `snapshotEvents()` /
// `ownEvents()`，没有 `events` 数组；本预设最初针对的是带 `events` 数组的旧
// 版本。两者都吃，读不到就退化为空，绝不抛错——这里的读取发生在每次
// system-prompt assembly 的热路径上，抛错会让整个会话无法产生任何一轮。

/** 首个真实用户消息文本；`eventAt` 路径命中即停，不复制整个日志。 */
export function firstUserTextOf(session) {
  if (session === undefined || session === null) return ''
  if (Array.isArray(session.events)) {
    const userMsg = session.events.find((e) => e.type === 'user/message')
    return extractText(userMsg?.data)
  }
  if (typeof session.eventAt === 'function') {
    const total = Number(session.seq ?? 0)
    for (let seq = 0; seq < total; seq += 1) {
      const event = session.eventAt(seq)
      if (event !== undefined && event.type === 'user/message') return extractText(event.data)
    }
  }
  return ''
}

/**
 * 增量 tool/call 检测器。旧实现每次 assembly 都 `session.events.some(...)`；
 * 新 API 下改为按 session 记录扫描游标：只向前推进，已见 tool/call 后恒为
 * true，因此每次 assembly 摊销 O(1)，长会话也不会退化。
 */
export function createToolCallTracker() {
  const cursor = new Map()
  const seen = new Set()
  return function hasToolCall(session) {
    if (session === undefined || session === null) return false
    if (Array.isArray(session.events)) return session.events.some((e) => e.type === 'tool/call')
    if (typeof session.eventAt !== 'function') return false
    if (seen.has(session.id)) return true
    const total = Number(session.seq ?? 0)
    let from = cursor.get(session.id) ?? 0
    if (from > total) from = 0 // 会话被替换/回绕：重新从头扫
    for (let seq = from; seq < total; seq += 1) {
      const event = session.eventAt(seq)
      if (event !== undefined && event.type === 'tool/call') {
        seen.add(session.id)
        cursor.set(session.id, total)
        return true
      }
    }
    cursor.set(session.id, total)
    return false
  }
}

/** 会话模式（持久事件推导，resume 安全）。 */
export function sessionMode(session) {
  const text = firstUserTextOf(session)
  return text.trim() ? classifyTask(text) : 'weak'
}

export function extractText(data) {
  if (!data) return ''
  const payload = data && typeof data.message === 'object' && data.message !== null ? data.message : data
  const content = Array.isArray(payload.content) ? payload.content : []
  return content.map((c) => (typeof c === 'string' ? c : (c.text ?? ''))).join(' ')
}

export function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0))
}

/** 只替换人设 section，保留其余 sections（plan-mode section 优先保留）。 */
export function applyPersona(sections, personaText) {
  const rest = (sections || []).filter(
    (section) => section.name !== 'persona' && !/persona/i.test(section.name),
  )
  return [...rest, { name: 'router-persona', text: personaText, order: 0 }]
}

/** 解析模式 token：0-100 数字、0.0-1.0 或带名。 */
export function parseMode(token) {
  if (token === undefined || token === null) return null
  const t = String(token).trim().toLowerCase()
  if (t === 'auto') return 'auto'
  if (t === 'weak' || t === 'router') return 'weak'
  if (t === 'spec' || t === 'spec-lean') return 0
  if (t === 'balanced' || t === 'mixed') return 0.3
  if (t === 'react' || t === 'react-lean') return 1
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  if (t.includes('.')) return clamp01(n)
  return clamp01(n / 100)
}

// ── 近距离引导（P14/P16/P20）──────────────────────────────────────────────
// 智能路由（smart）版本的引导：三带全覆盖 + 深度自适应。

const GUIDE_REACT =
  '\nRouter: this is a build task — work hands-on. Produce working output directly, verify it by reading and running, and fix fast. Skip unrequested scaffolding, tests, and ceremony. Finish with a usable deliverable and a short summary.'
const GUIDE_REACT_DEEP =
  '\nRouter: this is a complex build task — work hands-on. Think first about the architecture, edge cases, and integration points, then produce the implementation directly. Verify by reading and running; fix fast. Skip unrequested scaffolding and ceremony. Produce when your information is complete; end each reasoning block with a decision or an information need.'
const GUIDE_SPEC =
  '\nRouter: this is a fix/maintenance task — inspect first. Understand the current state before changing anything, plan the minimal correct change, then commit and verify. Do not rewrite more than the problem requires, and do not duplicate work that is already done.'
const GUIDE_SPEC_DEEP =
  '\nRouter: this is a complex fix/maintenance task — inspect first. Think deeply about the root cause, the minimal correct change, edge cases, and integration points. Do not spend reasoning on the environment or tooling. Produce when your information is complete; end each reasoning block with a decision or an information need.'
const GUIDE_WEAK =
  '\nRouter: classify this task (build or fix) now, then adopt the matching style — build: direct production; fix: inspect-first. Think deeply first, then commit and act.'
const GUIDE_WEAK_DEEP =
  '\nRouter: classify this task (build or fix) now, then adopt the matching style — build: direct production; fix: inspect-first. Think deeply about the architecture, edge cases, and integration points. Do not spend reasoning on the environment or tooling. Produce when your information is complete. End each reasoning block with a decision or an information need.'

// ── ml-planner：正交 ML 块（S-001 / R-013）────────────────────────────────
// 设计要点（为什么是这个形状）：
//  1. **正交追加**，不取代 —— band 判定逻辑完全不动，故既有 react/spec/weak 引导
//     与带文本逐字节不变（AC-011 / VC-012）。"修复训练脚本报错"这类任务会同时拿到
//     fix 引导与 ML 块，而不是丢掉 fix 语义。
//  2. **紧凑**：整块 ≤600 字符（VC-033 计量）。长内容不进上下文 —— 6/7 项研究清单
//     与 6 条硬约束的**答案**落盘为 dsh-plans/<slug>/ML_BRIEF.md 必交工件，注入里只
//     留指针。这是"强制注意力"与"上下文防腐化"同时成立的关键（S-001 的裁定理由）。
//  3. 中文（C-001：路由可见文本与用户提示词同语言）。
const ML_GUIDE_BLOCK =
  '\n【ML 任务】命中机器学习关键词。写训练代码前，先加载 ml-modeling-plan 技能，'
  + '并把研究清单逐项答案落盘为 dsh-plans/<slug>/ML_BRIEF.md（6 项：任务类型与目标变量 / '
  + '数据结构与划分 / 调参用哪份数据·测试集是否只用一次 / 指标与基线 / 泄漏与分布偏移 / '
  + '可解释性要求与因果措辞）。未逐项回答前不要写训练代码。硬约束：'
  + '①先跑基线再上复杂模型；②每个提升主张须给可复现验证（划分/种子/口径）；'
  + '③指标须给波动区间，不得只报单点最优；④训练集与验证集背离时先查泄漏与过拟合；'
  + '⑤不得在缺乏稳定性与忠实性证据时报告特征重要性或 SHAP，不得把重要性措辞为因果。'

/** 按 ML 触发条件把块追加到既有带引导之后（base 可为 null，如 transition 带）。 */
function appendMlBlock(base, text) {
  if (!isMlText(text)) return base
  return base === null || base === undefined ? ML_GUIDE_BLOCK : base + ML_GUIDE_BLOCK
}

/** 智能路由引导：按模式与复杂度选文本；transition 带返回 null（不注入）。 */
export function guideFor(mode, text) {
  const complex = isComplexTask(text)
  const base = (() => {
    switch (bandOf(mode)) {
      case 'react': return complex ? GUIDE_REACT_DEEP : GUIDE_REACT
      case 'spec': return complex ? GUIDE_SPEC_DEEP : GUIDE_SPEC
      case 'weak': return complex ? GUIDE_WEAK_DEEP : GUIDE_WEAK
      default: return null
    }
  })()
  // ml-planner: 正交追加 —— 沿用 base 的三条分支逐字节不变，只在末尾追加 ML 块。
  return base === null ? (isMlText(text) ? ML_GUIDE_BLOCK : null) : appendMlBlock(base, text)
}

// ── 智能规划引导（plan-first 变体，尊重 dsh-plans 规划工作流）──────────────
// 与智能路由的引导同机制，但全部为"先规划后实施"语义：即使某带风格是
// 直接执行（react），也先走规划工件（create-a-*-plan 技能），只是计划
// 保持精简、实施保持快速闭环。

const GUIDE_REACT_PLAN =
  '\nRouter: this is a build task — plan lean. Use the matching planning skill and keep the plan artifact tight (goal → steps → verification). Then implement hands-on: produce, verify, fix. Finish with a usable deliverable and a short summary.'
const GUIDE_REACT_PLAN_DEEP =
  '\nRouter: this is a complex build task — plan first: goal, key decisions, integration points, edge cases. Use the matching planning skill, then implement hands-on and verify by reading and running. Produce when your information is complete; end each reasoning block with a decision or an information need.'
const GUIDE_SPEC_PLAN =
  '\nRouter: this is a fix/maintenance task — plan first. Research the current state, then present the minimal correct change as a plan artifact (root cause → change → verification) before implementing. Do not rewrite more than the problem requires, and do not duplicate work that is already done.'
const GUIDE_SPEC_PLAN_DEEP =
  '\nRouter: this is a complex fix/maintenance task — plan first, decision-complete. Think deeply about the root cause, the minimal correct change, edge cases, and integration points. Do not spend reasoning on the environment or tooling. Present the plan artifact before implementing; produce when your information is complete; end each reasoning block with a decision or an information need.'
const GUIDE_WEAK_PLAN =
  '\nRouter: classify this task (build or fix) now — if fix: plan first (root cause → change → verification) before acting; if build: plan lean, then produce directly. Either way, use the matching planning skill and commit when your information is complete.'
const GUIDE_WEAK_PLAN_DEEP =
  '\nRouter: classify this task (build or fix) now — if fix: plan first, decision-complete, before acting; if build: plan briefly (goal, key decisions, integration points) then produce directly. Use the matching planning skill. Think deeply about architecture, edge cases, and integration points; do not spend reasoning on the environment or tooling. Produce when your information is complete; end each reasoning block with a decision or an information need.'

/** 智能规划引导：按模式与复杂度选规划向文本；transition 带返回 null。 */
export function guideForPlanner(mode, text) {
  const complex = isComplexTask(text)
  // ml-planner: 三条分支的返回文本逐字节未改（AC-011/VC-012 的等价断言依赖这点）；
  // ML 块只以**追加**方式进入，且 transition 带（default ⇒ null）在命中 ML 时也给出块。
  let base
  switch (bandOf(mode)) {
    case 'react': base = complex ? GUIDE_REACT_PLAN_DEEP : GUIDE_REACT_PLAN; break
    case 'spec': base = complex ? GUIDE_SPEC_PLAN_DEEP : GUIDE_SPEC_PLAN; break
    case 'weak': base = complex ? GUIDE_WEAK_PLAN_DEEP : GUIDE_WEAK_PLAN; break
    default: base = null
  }
  if (base === null) return isMlText(text) ? ML_GUIDE_BLOCK : null
  return appendMlBlock(base, text)
}
