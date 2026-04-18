# picocode-cfg

Nanocoder configuration for the PicoCode DAG orchestration system. Contains agents, slash commands, and MCP server configs ready to copy to the global Nanocoder config location.

## Install

Copy each directory to the appropriate global location:

**Linux:**
```bash
# Agents
cp picocode-cfg/agents/*.md ~/.config/nanocoder/agents/

# Commands
cp picocode-cfg/commands/*.md ~/.config/nanocoder/commands/
```

**macOS:**
```bash
cp picocode-cfg/agents/*.md ~/Library/Preferences/nanocoder/agents/
cp picocode-cfg/commands/*.md ~/Library/Preferences/nanocoder/commands/
```

Or copy into `.nanocoder/` for project-level installation (agents and commands here override global ones):
```bash
cp picocode-cfg/agents/*.md .nanocoder/agents/
cp picocode-cfg/commands/*.md .nanocoder/commands/
```

## Contents

### Agents (`agents/`)

| File | Subagent name | Role |
|---|---|---|
| `context-scout.md` | `context-scout` | Read-only project survey |
| `context-insurgent.md` | `context-insurgent` | Deep code analysis |
| `junior-dev.md` | `junior-dev` | Implementer + triager |
| `tailwrench.md` | `tailwrench` | Verification runner (no file edits) |
| `documentation-expert.md` | `documentation-expert` | Documentation writer |
| `deep-researcher.md` | `deep-researcher` | Multi-source web research |
| `external-scout.md` | `external-scout` | External research with confidence levels |
| `autonomous-agent.md` | `autonomous-agent` | Last-resort fully autonomous agent |

> Note: There is no primary/headwrench agent — Nanocoder's base model fills that role. The DAG tools are registered directly and the base model orchestrates them.

### Commands (`commands/`)

| File | Invocation | Description |
|---|---|---|
| `plan-session.md` | `/plan-session <request>` | Start a planning session |
| `activate-plan.md` | `/activate-plan <plan-name>` | Execute a compiled plan |

## Tool name mapping (OpenCode → Nanocoder)

| OpenCode | Nanocoder |
|---|---|
| `bash` | `execute_bash` |
| `grep` | `search_file_contents` |
| `read` | `read_file` |
| `write` | `write_file` |
| `edit` | `string_replace` |
| `glob` | `find_files` |
| `task` | `agent` |
| `question` | `ask_user` |
| `skill` | n/a — replaced by `get_plan_following_guide` and `get_planning_schema` tools |

## Notes

- The `agent` tool is unavailable inside subagents (Nanocoder prevents recursion)
- `skill` has no Nanocoder equivalent — the guide and schema are exposed as `get_plan_following_guide` and `get_planning_schema` DAG tools instead
- `smart_grep_*`, `searxng_*`, `context7_*`, and `qdrant_*` tool names are unchanged
