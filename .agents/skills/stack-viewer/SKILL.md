---
name: stack-viewer
description: Inspect and visualize the complete Antigravity and Claude Code session stack (Skills, Subagents, Commands, Hooks, MCP servers, Plugins & mods, Settings, Memory, and Output styles) across all scopes in precedence order, showing active, shadowed, and disabled components. Trigger on /stack, "stack viewer", "show session stack", or "what skills/MCPs/plugins are loaded".
---

# stack-viewer (Antigravity & Claude Code)

Maps every component the current Antigravity / Claude Code session runs and the scope it is installed from (`Enterprise`, `CLI flag`, `Local`, `Project`, `User`, `Plugin`, `Built-in`), using the core engine in [.claude/skills/stack-viewer/hooks/stack.ts](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/.claude/skills/stack-viewer/hooks/stack.ts).

## How to Run in Antigravity

1. **Run the Stack Scanner & Generate Interactive UI:**
   ```bash
   npm run stack
   ```
   Or filter to a specific component type (`skills`, `agents`, `commands`, `hooks`, `mcp`, `plugins`, `settings`, `memory`, `styles`):
   ```bash
   npx tsx scripts/stack-viewer.mjs skills
   ```

2. **Open the Interactive Stack Viewer Pane in Browser:**
   When the Vite dev server is running (`npm run dev`), open:
   `http://localhost:5173/stack-viewer.html`
   - Press `1`–`9` or click any component type in the sidebar.
   - Click any scope bar (`▾` / `▸`) to fold or unfold it.
   - Press `/` to filter items within the selected component type, `f` to fold/expand all scopes, or `r` to refresh.
