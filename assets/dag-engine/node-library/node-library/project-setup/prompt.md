# Project Setup

**Subagent:** junior-dev
**Goal:** Execute the following setup operations: {{DESCRIPTION}}

**Hard Rules**
1. Output must be framed as instructions *to* junior-dev — not meta-commentary about the process.
2. Call the `task` tool with `subagent_type=junior-dev`.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve environment constraints, known dependency versions, and any prior failed attempts that affect how these steps should run.

2. **Prompt Drafting:** Draft the prompt for junior-dev. Include: the setup steps from `{{DESCRIPTION}}`, all relevant constraints retrieved, a step-by-step reporting requirement (success/failure and relevant output per step), and the following verbatim web search instruction — do not modify it: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

3. **Delegation Gate:** Before calling `task`, verify: prompt addresses junior-dev directly, verbatim web search instruction is included, retrieved context is integrated, return format is specified. Revise if any check fails, then call `task` with `subagent_type=junior-dev`.

4. **Note Taking:** Call `qdrant-store` with `collection_name={{PLAN_NAME}}`. At minimum capture: each setup step with success/failure status, and any output relevant to subsequent steps. Add missing notes if needed.

5. Call `next_step`.
