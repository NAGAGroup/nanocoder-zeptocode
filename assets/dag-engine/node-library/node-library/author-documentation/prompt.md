# Documentation

**Subagent:** documentation-expert
**Goal:** {{GOAL}}

**Hard Rules**
1. Draft and delegate a direct, actionable instruction set *to* documentation-expert — not meta-commentary.
2. Call the `agent` tool with `subagent_type=documentation-expert`.
3. Documentation-expert is limited to documentation files only — never instruct it to make code changes.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: verified code facts, API shapes, behavioral findings, and documentation conventions from prior steps.

2. **Prompt Drafting:** Draft the prompt for documentation-expert. Include: the documentation goal (`{{GOAL}}`), all verified technical facts as the mandatory source-of-truth, documentation conventions to follow, return format requirements, and the following verbatim web search instruction — do not modify it: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

3. **Delegation Gate:** Before calling `agent`, verify: prompt addresses documentation-expert directly, verbatim web search instruction is included, retrieved context is integrated, return format is specified, no code changes are requested. Revise if any check fails, then call `agent` with `subagent_type=documentation-expert`.

4. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: what was written, files changed, any decisions or assumptions downstream steps should know about. Add missing notes before proceeding.

5. Call `next_step`.
