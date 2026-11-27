/**
 * Antigravity adapter for `.claude/skills/stack-viewer/hooks/stack.ts`.
 *
 * Scans both Antigravity (`~/.gemini/config`, `~/.gemini/antigravity`, `.agents/`)
 * and Claude Code (`~/.claude`, `.claude/`) component directories, runs `buildStack()`
 * from `stack.ts`, prints the TUI view in the terminal, and generates an interactive
 * Antigravity Stack Viewer pane at `public/stack-viewer.html`.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  KINDS,
  SCOPE,
  buildStack,
  cell,
  counts,
  fit,
  frontmatterName,
  hookLabel,
} from '../.claude/skills/stack-viewer/hooks/stack.ts'

const norm = p => p.replace(/\\/g, '/')

const io = {
  async read(p) {
    try {
      return await fs.readFile(p, 'utf8')
    } catch {
      return undefined
    }
  },
  async list(p) {
    try {
      const entries = await fs.readdir(p, { withFileTypes: true })
      return entries.map(e => ({
        name: e.name,
        kind: e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other',
      }))
    } catch {
      return []
    }
  },
}

function parseJson(text) {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

async function markdownTree(dir, depth = 3, prefix = '') {
  const out = []
  for (const e of await io.list(dir)) {
    const full = `${dir}/${e.name}`
    if (e.kind === 'dir' && depth > 1) {
      out.push(...(await markdownTree(full, depth - 1, `${prefix}${e.name}:`)))
    } else if (e.kind !== 'dir' && e.name.endsWith('.md')) {
      out.push({ name: prefix + e.name.slice(0, -3), path: full })
    }
  }
  return out
}

async function scanSkillsDir(dir, scope, seen, out) {
  for (const e of await io.list(dir)) {
    if (e.kind !== 'dir' && e.kind !== 'other') continue
    const skillPath = `${dir}/${e.name}/SKILL.md`
    const content = await io.read(skillPath)
    if (content !== undefined) {
      const name = frontmatterName(content) ?? e.name
      const key = `s:${scope}:${name}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push({ scope, name, path: skillPath })
      }
    }
  }
}

async function scanAgentsDir(dir, scope, seen, out) {
  for (const a of await markdownTree(dir)) {
    const content = await io.read(a.path)
    const name = frontmatterName(content) ?? a.name.split(':').pop()
    const key = `a:${scope}:${name}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push({ scope, name, path: a.path })
    }
  }
}

async function scanCommandsDir(dir, scope, seen, out) {
  for (const c of await markdownTree(dir)) {
    const key = `c:${scope}:${c.name}`
    if (!seen.has(key)) {
      seen.add(key)
      out.push({ scope, name: c.name, path: c.path })
    }
  }
}

async function collectAntigravityStack() {
  const home = norm(os.homedir())
  const cwd = norm(process.cwd())
  const geminiConfig = `${home}/.gemini/config`
  const agyDir = `${home}/.gemini/antigravity`
  const claudeUserDir = `${home}/.claude`

  const files = {
    managedDir: undefined,
    skills: [],
    commands: [],
    agents: [],
    styles: [],
    plugins: [],
    mcp: [],
  }
  const seen = new Set()

  // 1. User & Project skills (Antigravity + Claude)
  await scanSkillsDir(`${geminiConfig}/skills`, 'user', seen, files.skills)
  await scanSkillsDir(`${claudeUserDir}/skills`, 'user', seen, files.skills)
  await scanSkillsDir(`${cwd}/.agents/skills`, 'project', seen, files.skills)
  await scanSkillsDir(`${cwd}/.claude/skills`, 'project', seen, files.skills)

  // 2. User & Project subagents
  await scanAgentsDir(`${geminiConfig}/agents`, 'user', seen, files.agents)
  await scanAgentsDir(`${claudeUserDir}/agents`, 'user', seen, files.agents)
  await scanAgentsDir(`${cwd}/.agents/agents`, 'project', seen, files.agents)
  await scanAgentsDir(`${cwd}/.claude/agents`, 'project', seen, files.agents)

  // 3. User & Project commands / workflows
  await scanCommandsDir(`${geminiConfig}/commands`, 'user', seen, files.commands)
  await scanCommandsDir(`${claudeUserDir}/commands`, 'user', seen, files.commands)
  await scanCommandsDir(`${cwd}/.agents/workflows`, 'project', seen, files.commands)
  await scanCommandsDir(`${cwd}/.claude/commands`, 'project', seen, files.commands)

  // 4. Built-in Antigravity skills
  const builtinSkills = []
  for (const e of await io.list(`${agyDir}/builtin/skills`)) {
    if (e.kind !== 'dir') continue
    const content = await io.read(`${agyDir}/builtin/skills/${e.name}/SKILL.md`)
    if (content !== undefined) {
      builtinSkills.push({ name: frontmatterName(content) ?? e.name, source: 'builtin' })
    }
  }

  // 5. Plugins (Antigravity plugins + project skills-dir mods like stack-viewer)
  const agyConfigJson = parseJson(await io.read(`${geminiConfig}/config.json`)) ?? {}
  const configuredPlugins = agyConfigJson.plugins ?? {}
  const pluginSkills = []
  const pluginAgents = []
  const pluginCommands = []

  for (const e of await io.list(`${geminiConfig}/plugins`)) {
    if (e.kind !== 'dir') continue
    const pName = e.name
    const pRoot = `${geminiConfig}/plugins/${pName}`
    const meta = configuredPlugins[pName]
    const manifest =
      parseJson(await io.read(`${pRoot}/.claude-plugin/plugin.json`)) ??
      parseJson(await io.read(`${pRoot}/plugin.json`)) ??
      parseJson(await io.read(`${pRoot}/package.json`))

    const version = meta?.installedFrom?.version ?? manifest?.version
    const marketplace = meta?.installedFrom?.marketplace ?? 'antigravity-plugins'
    const id = `${pName}@${marketplace}`

    // Scan plugin skills
    for (const se of await io.list(`${pRoot}/skills`)) {
      if (se.kind !== 'dir') continue
      const sc = await io.read(`${pRoot}/skills/${se.name}/SKILL.md`)
      if (sc !== undefined) {
        const sName = frontmatterName(sc) ?? se.name
        pluginSkills.push({ name: `${pName}:${sName}`, source: 'plugin', pluginName: pName })
      }
    }
    // Scan plugin agents
    for (const ae of await markdownTree(`${pRoot}/agents`)) {
      const ac = await io.read(ae.path)
      const aName = frontmatterName(ac) ?? ae.name.split(':').pop()
      pluginAgents.push({ agentType: `${pName}:${aName}`, source: 'plugin' })
    }
    // Scan plugin commands
    const pCmdNames = []
    for (const ce of await markdownTree(`${pRoot}/commands`)) {
      pCmdNames.push(ce.name)
      pluginCommands.push({ name: `${pName}:${ce.name}`, source: 'plugin', plugin: pName })
    }
    // Scan plugin hooks
    const hooksJson = parseJson(await io.read(`${pRoot}/hooks/hooks.json`))
    const hookEvents = []
    for (const [event, groups] of Object.entries(hooksJson?.hooks ?? {})) {
      for (const g of Array.isArray(groups) ? groups : []) {
        for (const hk of Array.isArray(g?.hooks) ? g.hooks : []) {
          hookEvents.push({ event, matcher: g?.matcher || undefined, command: hookLabel(hk) })
        }
      }
    }
    const modules = Array.isArray(hooksJson?.modules) ? hooksJson.modules.length : 0

    files.plugins.push({
      id,
      name: pName,
      version,
      root: pRoot,
      origin: 'installed',
      scope: 'user',
      commands: pCmdNames,
      styles: [],
      hookEvents,
      modules,
      mcpServers: [],
    })
  }

  // Scan project `.claude/skills/<mod>` for Claude Code mods (e.g. stack-viewer)
  for (const e of await io.list(`${cwd}/.claude/skills`)) {
    if (e.kind !== 'dir') continue
    const modRoot = `${cwd}/.claude/skills/${e.name}`
    const manifest = parseJson(await io.read(`${modRoot}/.claude-plugin/plugin.json`))
    if (!manifest) continue
    const hooksJson = parseJson(await io.read(`${modRoot}/hooks/hooks.json`))
    const modules = Array.isArray(hooksJson?.modules) ? hooksJson.modules.length : 0
    files.plugins.push({
      id: `${manifest.name ?? e.name}@skills-dir`,
      name: manifest.name ?? e.name,
      version: manifest.version,
      root: modRoot,
      origin: 'skills-dir',
      scope: 'project',
      commands: ['stack'],
      styles: [],
      hookEvents: [],
      modules,
      mcpServers: [],
    })
    pluginCommands.push({
      name: `${manifest.name ?? e.name}:stack`,
      source: 'plugin',
      plugin: manifest.name ?? e.name,
    })
  }

  // 6. MCP Servers (from ~/.gemini/config/mcp_config.json, ~/.gemini/antigravity/mcp_config.json, .mcp.json, and active ~/.gemini/antigravity/mcp/*)
  const userMcpJson = parseJson(await io.read(`${geminiConfig}/mcp_config.json`))
  for (const name of Object.keys(userMcpJson?.mcpServers ?? {})) {
    files.mcp.push({ scope: 'user', name })
  }
  const localMcpJson = parseJson(await io.read(`${agyDir}/mcp_config.json`))
  for (const name of Object.keys(localMcpJson?.mcpServers ?? {})) {
    files.mcp.push({ scope: 'local', name })
  }
  const projMcpJson = parseJson(await io.read(`${cwd}/.mcp.json`))
  for (const name of Object.keys(projMcpJson?.mcpServers ?? {})) {
    files.mcp.push({ scope: 'project', name })
  }

  const mcpTools = []
  const mcpSeen = {}
  for (const s of await io.list(`${agyDir}/mcp`)) {
    if (s.kind !== 'dir') continue
    const serverName = s.name
    const toolEntries = (await io.list(`${agyDir}/mcp/${serverName}`)).filter(
      t => t.kind === 'file' && t.name.endsWith('.json'),
    )
    if (toolEntries.length === 0) {
      mcpTools.push({ name: '_connected', serverName })
    } else {
      for (const t of toolEntries) {
        mcpTools.push({ name: t.name.slice(0, -5), serverName })
      }
    }
    if (files.mcp.some(m => m.scope === 'local' && m.name === serverName)) mcpSeen[serverName] = 'local'
    else if (files.mcp.some(m => m.scope === 'project' && m.name === serverName)) mcpSeen[serverName] = 'project'
    else if (files.mcp.some(m => m.scope === 'user' && m.name === serverName)) mcpSeen[serverName] = 'user'
    else if (serverName.includes('plugin')) mcpSeen[serverName] = 'plugin'
  }

  // If codebase-memory-mcp binary is installed locally, expose its 17 native MCP tools
  const cbmExe = `${home}/AppData/Local/Programs/codebase-memory-mcp/codebase-memory-mcp.exe`
  if (
    files.mcp.some(m => m.name === 'codebase-memory-mcp') &&
    !mcpTools.some(t => t.serverName === 'codebase-memory-mcp')
  ) {
    try {
      await fs.access(cbmExe)
      const cbmToolNames = [
        'index_repository',
        'list_projects',
        'index_status',
        'delete_project',
        'search_graph',
        'search_code',
        'trace_path',
        'get_code_snippet',
        'get_graph_schema',
        'get_architecture',
        'query_graph',
        'manage_adr',
        'detect_changes',
        'compare_graphs',
        'check_index_coverage',
        'ingest_traces',
        'index_cross_repo',
      ]
      for (const name of cbmToolNames) {
        mcpTools.push({ name, serverName: 'codebase-memory-mcp' })
      }
      mcpSeen['codebase-memory-mcp'] = 'local'
    } catch {
      // binary not installed
    }
  }

  // 7. Build loaded Facts
  // Precedence for skills: User > Project on name clash
  const userSkillNames = new Set(files.skills.filter(s => s.scope === 'user').map(s => s.name))
  const loadedSkills = [
    ...files.skills
      .filter(s => s.scope === 'user')
      .map(s => ({ name: s.name, source: 'userSettings' })),
    ...files.skills
      .filter(s => s.scope === 'project' && !userSkillNames.has(s.name))
      .map(s => ({ name: s.name, source: 'projectSettings' })),
    ...pluginSkills,
    ...builtinSkills,
  ]

  // Precedence for agents: Project > User > Plugin
  const projAgentNames = new Set(files.agents.filter(a => a.scope === 'project').map(a => a.name))
  const loadedAgents = [
    ...files.agents
      .filter(a => a.scope === 'project')
      .map(a => ({ agentType: a.name, source: 'projectSettings' })),
    ...files.agents
      .filter(a => a.scope === 'user' && !projAgentNames.has(a.name))
      .map(a => ({ agentType: a.name, source: 'userSettings' })),
    ...pluginAgents,
  ]

  const builtinAgentListing = [
    { name: 'self', description: "Inherits parent agent's full configuration, tools, and model." },
    { name: 'research', description: 'Read-only research subagent for exploring codebase and docs.' },
    { name: 'browser', description: 'Operates built-in webview browser to interact with live web apps.' },
    { name: 'image-generator', description: 'Generates or edits images from a brief.' },
  ]

  const builtinSlashCommands = [
    { name: 'goal', source: 'builtin', description: 'Run a long-running task thoroughly until the goal is achieved.' },
    { name: 'compact', source: 'builtin', description: 'Compact or summarize conversation context.' },
    { name: 'schedule', source: 'builtin', description: 'Run an instruction on a recurring schedule or timer.' },
    { name: 'browser', source: 'builtin', description: 'Web browsing and interacting with live web applications.' },
    { name: 'plan', source: 'builtin', description: 'Step-by-step planning before execution.' },
    { name: 'grill-me', source: 'builtin', description: 'Interactive interview to resolve design decisions.' },
    { name: 'teamwork', source: 'builtin', description: 'Coordinate a team of autonomous agents working together.' },
    { name: 'learn', source: 'builtin', description: 'Persist a learned behavior or setup for future tasks.' },
    { name: 'boost', source: 'builtin', description: 'Deep thinking, strategic planning, and rigorous verification.' },
  ]

  const loadedCommands = [
    ...files.commands.map(c => ({
      name: c.name,
      source: c.scope === 'user' ? 'userSettings' : 'projectSettings',
    })),
    ...pluginCommands,
    ...builtinSlashCommands,
  ]

  // 8. Settings layers
  const agySettingsJson = parseJson(await io.read(`${agyDir}/settings.json`)) ?? {}
  const projClaudeSettings = parseJson(await io.read(`${cwd}/.claude/settings.json`)) ?? {}
  const localClaudeSettings = parseJson(await io.read(`${cwd}/.claude/settings.local.json`)) ?? {}
  const eccInstallState = parseJson(await io.read(`${cwd}/.agents/ecc-install-state.json`))

  const enabledPluginsMap = {}
  for (const p of files.plugins) {
    if (p.origin === 'installed') {
      const cfgEntry = configuredPlugins[p.name]
      enabledPluginsMap[p.id] = cfgEntry?.enabled !== false
    }
  }
  if (configuredPlugins['googlecloudtools.datacloud_telemetry']) {
    enabledPluginsMap['datacloud_telemetry@googlecloudtools'] =
      configuredPlugins['googlecloudtools.datacloud_telemetry'].enabled !== false
  }

  const settings = {
    local: {
      ...agySettingsJson,
      ...localClaudeSettings,
    },
    project: {
      ...projClaudeSettings,
      ...(eccInstallState ? { eccProfile: eccInstallState.profile ?? 'installed' } : {}),
    },
    user: {
      ...(agyConfigJson.userSettings ?? {}),
      enabledPlugins: enabledPluginsMap,
      sidecars: agyConfigJson.sidecars ?? {},
    },
  }

  // 9. Memory & Rules files
  const memory = []
  const addMemoryFile = async (filePath, type) => {
    const content = await io.read(filePath)
    if (content !== undefined) {
      const tokens = Math.max(1, Math.round(content.length / 4))
      memory.push({ path: filePath, type, tokens })
    }
  }

  await addMemoryFile(`${cwd}/PROJECT_CONTEXT.md`, 'Project')
  await addMemoryFile(`${cwd}/CLAUDE.md`, 'Project')
  await addMemoryFile(`${cwd}/.planning/PROJECT.md`, 'Project')
  await addMemoryFile(`${cwd}/.planning/STATE.md`, 'AutoMem')

  for (const r of await markdownTree(`${cwd}/.agents/rules`)) {
    await addMemoryFile(r.path, 'Project')
  }
  for (const r of await markdownTree(`${cwd}/.claude/rules`)) {
    await addMemoryFile(r.path, 'Project')
  }
  for (const r of await markdownTree(`${geminiConfig}/rules`)) {
    await addMemoryFile(r.path, 'User')
  }

  const TOTAL_SKILLS_BUDGET = 85
  const totalUniqueSkills = loadedSkills.length
  const skillsOverBudget = totalUniqueSkills > TOTAL_SKILLS_BUDGET ? totalUniqueSkills - TOTAL_SKILLS_BUDGET : undefined

  const facts = {
    skills: loadedSkills,
    agents: loadedAgents,
    agentListing: builtinAgentListing,
    commands: loadedCommands,
    mcpTools,
    memory,
    settings,
    activeStyle: 'Concise',
    mcpSeen,
    skillsOverBudget,
    home,
    cwd,
  }

  const sections = buildStack(files, facts)
  customizeLabelsForAntigravity(sections)

  return {
    header: {
      version: 'Antigravity · Gemini 4 Argon (High)',
      where: cwd.startsWith(home + '/') ? `~/${cwd.slice(home.length + 1)}` : cwd,
    },
    sections,
  }
}

function customizeLabelsForAntigravity(sections) {
  for (const sec of sections) {
    for (const sc of sec.scopes) {
      if (sec.kind === 'skills') {
        if (sc.id === 'user') sc.where = '~/.gemini/config/skills · ~/.claude/skills'
        if (sc.id === 'project') sc.where = '.agents/skills · .claude/skills'
        if (sc.id === 'plugin') sc.where = '~/.gemini/config/plugins/<plugin>/skills'
        if (sc.id === 'builtin') sc.where = '~/.gemini/antigravity/builtin/skills'
      } else if (sec.kind === 'agents') {
        if (sc.id === 'project') sc.where = '.agents/agents · .claude/agents'
        if (sc.id === 'user') sc.where = '~/.gemini/config/agents'
        if (sc.id === 'plugin') sc.where = '~/.gemini/config/plugins/<plugin>/agents'
        if (sc.id === 'builtin') sc.where = 'ship with Antigravity'
      } else if (sec.kind === 'commands') {
        if (sc.id === 'user') sc.where = '~/.gemini/config/commands · ~/.claude/commands'
        if (sc.id === 'project') sc.where = '.agents/workflows · .claude/commands'
        if (sc.id === 'builtin') sc.where = 'Antigravity slash commands'
      } else if (sec.kind === 'hooks') {
        if (sc.id === 'local') sc.where = '~/.gemini/antigravity/settings.json'
      } else if (sec.kind === 'mcp') {
        if (sc.id === 'local') sc.where = '~/.gemini/antigravity/mcp_config.json'
        if (sc.id === 'user') sc.where = '~/.gemini/config/mcp_config.json'
        if (sc.id === 'session') sc.where = '~/.gemini/antigravity/mcp (active session)'
      } else if (sec.kind === 'plugins') {
        if (sc.id === 'user') sc.where = '~/.gemini/config/config.json · plugins/'
        if (sc.id === 'skillsdir-project') sc.where = '.claude/skills/<mod>'
      } else if (sec.kind === 'settings') {
        if (sc.id === 'local') sc.where = '~/.gemini/antigravity/settings.json'
        if (sc.id === 'project') sc.where = '.agents/ecc-install-state.json · .claude/settings.json'
        if (sc.id === 'user') sc.where = '~/.gemini/config/config.json (userSettings)'
      } else if (sec.kind === 'memory') {
        if (sc.id === 'project') sc.where = 'PROJECT_CONTEXT.md · .agents/rules · .planning'
        if (sc.id === 'user') sc.where = '~/.gemini/config/rules'
        if (sc.id === 'automem') sc.where = '.planning/STATE.md'
      } else if (sec.kind === 'styles') {
        if (sc.id === 'builtin') sc.where = 'ship with Antigravity / Claude Code'
      }
    }
  }
}

function renderTerminal(header, sections, selectedKind) {
  const totals = sections
    .map(counts)
    .reduce(
      (t, c) => ({ active: t.active + c.active, shadowed: t.shadowed + c.shadowed, off: t.off + c.off }),
      { active: 0, shadowed: 0, off: 0 },
    )

  const lines = []
  lines.push('╭──────────────────────────────────────────────────────────────────────────────────────╮')
  lines.push(`│ ◆ Session stack  ${cell(header.version, 67)} │`)
  lines.push(
    `│ ${cell(header.where, 42)} ${cell(`${totals.active} active · ${totals.shadowed} shadowed · ${totals.off} off`, 41, 'right')} │`,
  )
  lines.push('╰──────────────────────────────────────────────────────────────────────────────────────╯')
  lines.push('')
  lines.push(' COMPONENTS')
  KINDS.forEach((k, idx) => {
    const sec = sections.find(s => s.kind === k.kind)
    const c = counts(sec)
    const marker = (!selectedKind && idx === 0) || selectedKind === k.kind ? '▌' : ' '
    const extra = [c.shadowed ? `${c.shadowed} shadowed` : '', c.off ? `${c.off} off` : ''].filter(Boolean).join(', ')
    lines.push(
      `${marker}${idx + 1}: ${cell(k.title, 16)} ${cell(String(c.active), 4, 'right')} ${sec.noun}${extra ? ` (${extra})` : ''}`,
    )
  })

  const toShow = selectedKind ? sections.filter(s => s.kind === selectedKind) : sections
  for (const sec of toShow) {
    const meta = KINDS.find(k => k.kind === sec.kind)
    const c = counts(sec)
    const summary = [`${c.active} ${sec.noun}`, c.shadowed ? `${c.shadowed} shadowed` : '', c.off ? `${c.off} off` : '']
      .filter(Boolean)
      .join(' · ')
    lines.push('')
    lines.push(`── ${meta.title}   ${summary} ──`)
    lines.push(`   ${sec.rule}`)
    if (sec.extra) lines.push(`   ${sec.extra}`)
    sec.scopes.forEach((sc, i) => {
      const rank = i + 1
      const empty = sc.items.length === 0
      const marker = empty ? ' ' : '▾'
      lines.push(
        `   ${cell(String(rank), 2, 'right')} ${marker} ${cell(SCOPE[sc.id].label, 19)} ${cell(empty ? '—' : String(sc.items.length), 4, 'right')}  ${sc.where}`,
      )
      if (!empty) {
        const preview = sc.items.slice(0, 12)
        const colW = Math.min(34, Math.max(12, ...preview.map(it => it.name.length)))
        for (const it of preview) {
          const note = it.isInferred ? `≈ ${it.note ?? 'scope read off files'}` : it.note
          const tail = [it.detail, note].filter(Boolean).join('  ')
          const statusMark = it.status === 'shadowed' ? ' [shadowed]' : it.status === 'off' ? ' [off]' : it.isSelected ? ' ★' : ''
          lines.push(`        ${cell(it.name + statusMark, colW + 2)} ${tail ? fit(tail, 56) : ''}`)
        }
        if (sc.items.length > 12) {
          lines.push(`        … +${sc.items.length - 12} more (open http://localhost:5173/stack-viewer.html to browse all)`)
        }
      } else if (sc.note) {
        lines.push(`        ${sc.note}`)
      }
    })
  }
  return lines.join('\n')
}

function generateInteractiveHtml(data) {
  const payload = JSON.stringify({
    header: data.header,
    sections: data.sections,
    kinds: KINDS,
    scopes: SCOPE,
    generatedAt: new Date().toISOString(),
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Session Stack · Antigravity Stack Viewer</title>
  <style>
    :root {
      --bg: #1e1e1c;
      --panel: #262624;
      --row-bg: #3d3d3a;
      --row-hover: #4a4a46;
      --orange: #d97757;
      --orange-soft: rgba(217, 119, 87, 0.14);
      --ivory: #faf9f5;
      --gray: #b0aea5;
      --dim: #87867f;
      --line: #5e5d59;
      --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'SF Mono', Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--ivory);
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.55;
      min-height: 100vh;
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .pane {
      width: 100%;
      max-width: 1120px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .header-box {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(0, 0, 0, 0.18);
    }
    .header-top, .header-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .diamond { color: var(--orange); font-weight: 700; }
    .title { color: var(--ivory); font-weight: 700; }
    .version { color: var(--dim); margin-left: 8px; }
    .where { color: var(--dim); }
    .totals .active { color: var(--ivory); font-weight: 600; }
    .totals .shadowed { color: var(--orange); }
    .totals .shadowed.zero { color: var(--dim); }
    .totals .off { color: var(--dim); }

    .body-cols {
      display: grid;
      grid-template-columns: 235px 1fr;
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 780px) {
      .body-cols { grid-template-columns: 1fr; }
    }
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 2px;
      user-select: none;
    }
    .sidebar-heading {
      color: var(--dim);
      font-size: 11px;
      letter-spacing: 0.08em;
      padding: 4px 8px 6px;
    }
    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: transparent;
      border: none;
      color: var(--dim);
      font-family: inherit;
      font-size: 13px;
      padding: 6px 8px 6px 0;
      border-radius: 5px;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .nav-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--ivory);
    }
    .nav-btn.selected {
      color: var(--ivory);
      background: var(--orange-soft);
      font-weight: 600;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .nav-bar {
      color: var(--orange);
      width: 10px;
      display: inline-block;
      font-weight: 700;
    }
    .nav-count {
      color: var(--dim);
      font-variant-numeric: tabular-nums;
    }
    .nav-btn.selected .nav-count {
      color: var(--ivory);
    }

    .legend {
      margin-top: 16px;
      padding: 10px 8px;
      border-top: 1px solid rgba(94, 93, 89, 0.45);
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 12px;
    }
    .legend-row { display: flex; gap: 10px; align-items: center; }
    .legend-name { width: 46px; }
    .legend-name.active { color: var(--ivory); }
    .legend-name.shadowed { color: var(--gray); text-decoration: line-through; }
    .legend-name.off { color: var(--line); }
    .legend-name.inferred { color: var(--dim); }
    .legend-desc { color: var(--dim); }

    .main {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    .sec-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 12px;
    }
    .sec-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
    }
    .sec-title { color: var(--orange); font-weight: 700; font-size: 15px; }
    .sec-summary { color: var(--dim); }
    .sec-rule { color: var(--dim); font-style: italic; }
    .sec-extra { color: var(--orange); font-size: 12px; }

    .search-input {
      background: #1a1a18;
      border: 1px solid var(--line);
      color: var(--ivory);
      font-family: inherit;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 5px;
      width: 220px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--orange);
    }

    .scopes-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 4px;
    }
    .scope-block {
      display: flex;
      flex-direction: column;
    }
    .scope-bar {
      display: grid;
      grid-template-columns: 28px 210px 48px 1fr;
      align-items: center;
      gap: 8px;
      padding: 5px 10px;
      border-radius: 5px;
      user-select: none;
    }
    .scope-bar.filled {
      background: var(--row-bg);
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .scope-bar.filled:hover {
      background: var(--row-hover);
    }
    .scope-bar.empty {
      opacity: 0.72;
      padding-top: 2px;
      padding-bottom: 2px;
    }
    .scope-rank {
      text-align: right;
      font-weight: 700;
      color: var(--orange);
    }
    .scope-bar.empty .scope-rank {
      color: var(--line);
      font-weight: 400;
    }
    .scope-label {
      color: var(--ivory);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scope-bar.empty .scope-label {
      color: var(--line);
      font-weight: 400;
    }
    .scope-count {
      text-align: right;
      font-weight: 700;
      color: var(--ivory);
      font-variant-numeric: tabular-nums;
    }
    .scope-bar.empty .scope-count {
      color: var(--line);
      font-weight: 400;
    }
    .scope-where {
      color: var(--dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-left: 6px;
    }
    .scope-bar.empty .scope-where {
      color: var(--line);
    }

    .scope-items {
      display: flex;
      flex-direction: column;
      padding: 4px 10px 6px 44px;
      gap: 2px;
    }
    .item-row {
      display: grid;
      grid-template-columns: minmax(180px, 310px) 1fr;
      gap: 14px;
      align-items: baseline;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .item-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .item-name {
      word-break: break-all;
    }
    .item-name.active { color: var(--ivory); }
    .item-name.selected { color: var(--orange); font-weight: 700; }
    .item-name.shadowed { color: var(--gray); text-decoration: line-through; }
    .item-name.off { color: var(--line); }

    .item-tail {
      color: var(--dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-tail.shadowed { color: var(--orange); }
    .item-tail.off { color: var(--line); }

    .scope-peek {
      padding: 4px 10px 4px 44px;
      color: var(--dim);
      cursor: pointer;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scope-peek .click-hint {
      color: var(--orange);
      margin-left: 10px;
    }
    .scope-note {
      padding: 2px 10px 4px 44px;
      color: var(--dim);
      font-style: italic;
    }

    .footer {
      border-top: 1px solid rgba(94, 93, 89, 0.45);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .toolbar {
      display: flex;
      gap: 8px;
    }
    .btn {
      background: var(--row-bg);
      border: 1px solid var(--line);
      color: var(--ivory);
      font-family: inherit;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .btn:hover {
      background: var(--row-hover);
      border-color: var(--orange);
    }
    .hint {
      color: var(--dim);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="pane" id="app"></div>
  <script>
    const DATA = ${payload};
    let selected = 'skills';
    const toggled = new Set();
    let filterText = '';

    function counts(section) {
      const c = { active: 0, shadowed: 0, off: 0 };
      for (const s of section.scopes) {
        for (const i of s.items) c[i.status]++;
      }
      return c;
    }

    function isExpanded(kind, scope) {
      const byDefault = scope.items.length > 0 && !(scope.id === 'builtin' && scope.items.length > 15);
      const id = kind + ':' + scope.id;
      return toggled.has(id) ? !byDefault : byDefault;
    }

    function toggleScope(kind, scopeId) {
      const id = kind + ':' + scopeId;
      if (toggled.has(id)) toggled.delete(id);
      else toggled.add(id);
      render();
    }

    function foldAll() {
      const sec = DATA.sections.find(s => s.kind === selected);
      if (!sec) return;
      const anyOpen = sec.scopes.some(s => s.items.length > 0 && isExpanded(selected, s));
      for (const s of sec.scopes) {
        if (s.items.length === 0) continue;
        const open = isExpanded(selected, s);
        if (anyOpen && open) toggleScope(selected, s.id);
        else if (!anyOpen && !open) toggleScope(selected, s.id);
      }
      render();
    }

    function peekNames(items) {
      const names = items.map(i => i.name);
      const shown = names.slice(0, 5).join(', ');
      return names.length > 5 ? shown + ' +' + (names.length - 5) : shown;
    }

    function esc(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function render() {
      const totals = DATA.sections.map(counts).reduce(
        (t, c) => ({ active: t.active + c.active, shadowed: t.shadowed + c.shadowed, off: t.off + c.off }),
        { active: 0, shadowed: 0, off: 0 }
      );
      const section = DATA.sections.find(s => s.kind === selected) || DATA.sections[0];
      const meta = DATA.kinds.find(k => k.kind === section.kind);
      const secCounts = counts(section);
      const summary = [
        secCounts.active + ' ' + section.noun,
        secCounts.shadowed ? secCounts.shadowed + ' shadowed' : '',
        secCounts.off ? secCounts.off + ' off' : ''
      ].filter(Boolean).join(' · ');

      const q = filterText.trim().toLowerCase();

      const navHtml = DATA.kinds.map((k, idx) => {
        const s = DATA.sections.find(x => x.kind === k.kind);
        const c = counts(s);
        const isSel = k.kind === selected;
        return \`
          <button class="nav-btn \${isSel ? 'selected' : ''}" data-kind="\${k.kind}">
            <span class="nav-left">
              <span class="nav-bar">\${isSel ? '▌' : ''}</span>
              <span>\${idx + 1}: \${esc(k.title)}</span>
            </span>
            <span class="nav-count">\${c.active}</span>
          </button>
        \`;
      }).join('');

      const scopesHtml = section.scopes.map((sc, idx) => {
        const rank = idx + 1;
        const filteredItems = q
          ? sc.items.filter(it =>
              it.name.toLowerCase().includes(q) ||
              (it.detail && it.detail.toLowerCase().includes(q)) ||
              (it.note && it.note.toLowerCase().includes(q))
            )
          : sc.items;
        const empty = filteredItems.length === 0;
        const open = !empty && (q ? true : isExpanded(section.kind, sc));
        const marker = empty ? ' ' : (open ? '▾' : '▸');
        const label = DATA.scopes[sc.id]?.label || sc.id;

        let bodyHtml = '';
        if (open && !empty) {
          const rows = filteredItems.map(it => {
            const note = it.isInferred ? '≈ ' + (it.note || 'scope read off files') : it.note;
            const tail = [it.detail, note].filter(Boolean).join('  ');
            const nameCls = it.isSelected ? 'selected' : it.status;
            const tailCls = it.status === 'shadowed' ? 'shadowed' : it.status === 'off' ? 'off' : '';
            return \`
              <div class="item-row">
                <span class="item-name \${nameCls}">\${esc(it.name)}\${it.isSelected ? ' ★' : ''}</span>
                <span class="item-tail \${tailCls}" title="\${esc(tail)}">\${esc(tail)}</span>
              </div>
            \`;
          }).join('');
          bodyHtml = \`<div class="scope-items">\${rows}</div>\`;
        } else if (!empty) {
          bodyHtml = \`
            <div class="scope-peek" data-scope="\${sc.id}">
              <span>\${esc(peekNames(filteredItems))}</span>
              <span class="click-hint">click to open</span>
            </div>
          \`;
        }
        if (sc.note && (open || empty)) {
          bodyHtml += \`<div class="scope-note">\${esc(sc.note)}</div>\`;
        }

        return \`
          <div class="scope-block">
            <div class="scope-bar \${empty ? 'empty' : 'filled'}" \${empty ? '' : \`data-scope="\${sc.id}"\`}>
              <span class="scope-rank">\${rank}</span>
              <span class="scope-label">\${marker} \${esc(label)}</span>
              <span class="scope-count">\${empty ? '—' : filteredItems.length}</span>
              <span class="scope-where" title="\${esc(sc.where)}">\${esc(sc.where)}</span>
            </div>
            \${bodyHtml}
          </div>
        \`;
      }).join('');

      const app = document.getElementById('app');
      app.innerHTML = \`
        <div class="header-box">
          <div class="header-top">
            <div>
              <span class="diamond">◆ </span>
              <span class="title">Session stack</span>
              <span class="version">\${esc(DATA.header.version)}</span>
            </div>
            <div class="totals">
              <span class="active">\${totals.active} active</span>
              <span class="shadowed \${totals.shadowed ? '' : 'zero'}"> · \${totals.shadowed} shadowed</span>
              <span class="off"> · \${totals.off} off</span>
            </div>
          </div>
          <div class="header-sub">
            <span class="where">\${esc(DATA.header.where)}</span>
            <span class="where">Antigravity + Claude Code Stack Inspector</span>
          </div>
        </div>

        <div class="body-cols">
          <div class="sidebar">
            <div class="sidebar-heading">COMPONENTS</div>
            \${navHtml}
            <div class="legend">
              <div class="legend-row"><span class="legend-name active">name</span><span class="legend-desc">active</span></div>
              <div class="legend-row"><span class="legend-name shadowed">name</span><span class="legend-desc">shadowed</span></div>
              <div class="legend-row"><span class="legend-name off">name</span><span class="legend-desc">off</span></div>
              <div class="legend-row"><span class="legend-name inferred">≈</span><span class="legend-desc">read off files</span></div>
            </div>
          </div>

          <div class="main">
            <div class="sec-header">
              <div class="sec-title-wrap">
                <span class="sec-title">\${esc(meta.title)}</span>
                <span class="sec-summary">\${esc(summary)}</span>
              </div>
              <input
                type="search"
                id="search-box"
                class="search-input"
                placeholder="Filter \${esc(meta.title.toLowerCase())}…"
                value="\${esc(filterText)}"
              />
            </div>
            <div class="sec-rule">\${esc(section.rule)}</div>
            \${section.extra ? \`<div class="sec-extra">\${esc(section.extra)}</div>\` : ''}
            <div class="scopes-list">
              \${scopesHtml}
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="toolbar">
            <button class="btn" id="btn-refresh">[ refresh ]</button>
            <button class="btn" id="btn-fold">[ fold / expand all ]</button>
            <a class="btn" href="/" style="text-decoration:none">[ ← back to WhereDidItGo ]</a>
          </div>
          <div class="hint">1–9 or click a type · click a scope (▸ ▾) to open or fold it · / focuses filter</div>
        </div>
      \`;

      document.querySelectorAll('[data-kind]').forEach(btn => {
        btn.addEventListener('click', () => {
          selected = btn.getAttribute('data-kind');
          render();
        });
      });
      document.querySelectorAll('[data-scope]').forEach(el => {
        el.addEventListener('click', () => {
          toggleScope(selected, el.getAttribute('data-scope'));
        });
      });
      document.getElementById('btn-refresh')?.addEventListener('click', () => location.reload());
      document.getElementById('btn-fold')?.addEventListener('click', foldAll);
      const searchBox = document.getElementById('search-box');
      if (searchBox) {
        searchBox.addEventListener('input', e => {
          filterText = e.target.value;
          const pos = e.target.selectionStart;
          render();
          const nextBox = document.getElementById('search-box');
          if (nextBox) {
            nextBox.focus();
            nextBox.setSelectionRange(pos, pos);
          }
        });
      }
    }

    window.addEventListener('keydown', e => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          filterText = '';
          document.activeElement.blur();
          render();
        }
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        const idx = Number(e.key) - 1;
        if (DATA.kinds[idx]) {
          selected = DATA.kinds[idx].kind;
          render();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        location.reload();
      } else if (e.key === 'f' || e.key === 'F') {
        foldAll();
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-box')?.focus();
      }
    });

    render();
  </script>
</body>
</html>`
}

async function main() {
  const arg = process.argv[2]?.toLowerCase()
  const validKinds = new Set(KINDS.map(k => k.kind))
  const selectedKind = arg && validKinds.has(arg) ? arg : undefined

  const data = await collectAntigravityStack()
  const htmlPath = path.resolve(process.cwd(), 'public', 'stack-viewer.html')
  await fs.writeFile(htmlPath, generateInteractiveHtml(data), 'utf8')

  console.log(renderTerminal(data.header, data.sections, selectedKind))
  console.log(`\nInteractive Antigravity Stack Viewer written to: public/stack-viewer.html`)
  console.log(`Live URL: http://localhost:5173/stack-viewer.html`)
}

main().catch(err => {
  console.error('stack-viewer error:', err)
  process.exit(1)
})
