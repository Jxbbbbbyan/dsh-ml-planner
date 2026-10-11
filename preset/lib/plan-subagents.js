// dsh-plans: model-selectable, read-only planning-role subagent tool.
//
// The stock `subagent` tool fixes the child model at composition time, but the
// dsh-plans workflow persists a per-workspace model choice for each role
// (reviewer / criticizer) and passes it at spawn time. This small host plugin
// registers `run_plan_subagent`, which wraps the host `subagents` service with
// a runtime `model` parameter. It also denies the child the mutation, goal,
// user-question, and delegation tools, so reviewer/criticizer children are
// read-only structurally, not just by prompt.
//
// The file is plain CommonJS on purpose: the preset directory has no
// package.json, and the composition loader imports this module relative to the
// preset's own directory. No imports are used, so no node_modules resolution
// is needed. The read-only deny list is supplied by the composition's
// `config.deny` (data, not code), so it can be edited without touching this
// module and is re-read on every mount.

module.exports = {
  name: 'dsh-plans-plan-subagents',

  inject: ['tools', 'subagents'],

  apply(ctx, config) {
    const toolName = typeof config.toolName === 'string' && config.toolName !== '' ? config.toolName : 'run_plan_subagent'
    const provider = typeof config.provider === 'string' && config.provider !== '' ? config.provider : 'spawn'
    const deny = Array.isArray(config.deny) ? config.deny.filter((name) => typeof name === 'string') : []

    const definition = {
      name: toolName,
      description: 'Delegate one planning-role pass (reviewer or criticizer) to a fresh subagent that works in its own context and returns its final report. Use it only for dsh-plans reviewer/criticizer rounds after the user answered the refinement mode question. The child is read-only by construction: file-write tools, goal tools, user questions, and delegation tools are denied to it. It runs in the foreground: the call returns the child\'s complete final report. The optional model parameter is the exact persisted selector from dsh-plans/.state/config.json for the role; omit it to inherit the current session model.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'A short (3-5 word) label of the delegated role pass, e.g. "reviewer round 1" or "<topic>-review-a".',
          },
          prompt: {
            type: 'string',
            description: 'The complete, self-contained brief for the subagent. It does not share this conversation\'s context, so include everything it needs: the absolute path of the PLAN_vN.md to review, the read-only instruction, the artifact directory (it must NOT write files), and the required findings report format.',
          },
          model: {
            type: 'string',
            description: 'Optional exact model selector persisted in dsh-plans/.state/config.json for this role. Omit to inherit the current session model. Never invent a model name: only pass what the user confirmed.',
          },
        },
        required: ['description', 'prompt'],
      },
      output: {
        schema: { type: 'string' },
        render(_args, value) {
          return [{ type: 'text', text: value }]
        },
      },
      async execute(args, exec) {
        const parent = exec.agent
        if (!parent) throw new Error('run_plan_subagent requires a calling agent (exec.agent was undefined)')

        const request = {
          label: String(args.description ?? ''),
          prompt: [{ type: 'text', text: String(args.prompt ?? '') }],
          parent,
          toolFilter: { deny },
        }
        if (typeof args.model === 'string' && args.model.trim() !== '') {
          request.agentOptions = { model: args.model.trim() }
        }

        let run
        try {
          run = await ctx.subagents.start(provider, { signal: exec.signal, ...request })
        } catch (error) {
          throw new Error(
            `run_plan_subagent could not start${request.agentOptions ? ` with model "${request.agentOptions.model}"` : ''}: ${String(error && error.message ? error.message : error)}`
          )
        }

        let execution
        let disposal
        try {
          ;[execution] = await Promise.allSettled([run.result])
          ;[disposal] = await Promise.allSettled([Promise.resolve().then(() => run.dispose())])
        } catch (error) {
          throw new Error(`run_plan_subagent run failed: ${String(error && error.message ? error.message : error)}`)
        }

        if (execution.status === 'rejected') {
          const detail = String(execution.reason && execution.reason.message ? execution.reason.message : execution.reason)
          if (disposal.status === 'rejected') {
            throw new Error(`run_plan_subagent run failed: ${detail}; dispose failed: ${String(disposal.reason && disposal.reason.message ? disposal.reason.message : disposal.reason)}`)
          }
          throw new Error(`run_plan_subagent run failed: ${detail}`)
        }
        if (disposal.status === 'rejected') {
          throw new Error(`run_plan_subagent dispose failed: ${String(disposal.reason && disposal.reason.message ? disposal.reason.message : disposal.reason)}`)
        }

        const result = execution.value
        const text = (Array.isArray(result && result.output) ? result.output : [])
          .filter((block) => block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
          .map((block) => block.text)
          .join('')

        if (result && result.stopReason !== 'completed') {
          const reason = result.stopReason != null ? String(result.stopReason) : 'unknown'
          const suffix = text.length > 0 ? ` Partial output before the child ended:\n${text}` : ''
          throw new Error(`run_plan_subagent ended abnormally (${reason}) before it finished.${suffix}`)
        }

        return text
      },
    }

    const dispose = ctx.tools.register(definition)
    return () => dispose()
  },
}
