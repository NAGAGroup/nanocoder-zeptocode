# Triage

**Subagent:** junior-dev
**Goal:** {{GOAL}}
**Success criteria:** {{VERIFY_DESCRIPTION}}

Verification failed. Junior-dev will investigate the root cause and apply a fix. A dedicated verify step runs after — do not ask junior-dev to run verification commands.

**Hard Rules**
1. Address the prompt as direct instructions *to* junior-dev — not commentary about the process.
2. Call the `agent` tool with `subagent_type=junior-dev`.
3. The exact failed commands and verbatim error output must be in the prompt — junior-dev needs them to reproduce the failure.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the verbatim failure output, the exact failed commands, and any prior triage findings from earlier retry cycles.

2. **Prompt Generation:** Draft a cohesive message *to* junior-dev that includes:
   - The original goal (`{{GOAL}}`), verbatim failed commands, and exact error output for reproduction.
   - All prior triage attempts to prevent redundant investigation.
   - Clear instruction to investigate the root cause, apply a fix, and report back: root cause, changes made, files touched.
   - The following verbatim web search instruction — do not modify it: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

3. **Delegation Gate:** Before calling `agent`, verify: prompt addresses junior-dev directly, verbatim web search instruction is included, retrieved context is integrated, return format is specified, verbatim failure output is in the prompt (not summarized). Revise if any check fails, then call `agent` with `subagent_type=junior-dev`.

4. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: root cause, fix applied, files changed. Add missing notes if needed.

5. Call `next_step`.
