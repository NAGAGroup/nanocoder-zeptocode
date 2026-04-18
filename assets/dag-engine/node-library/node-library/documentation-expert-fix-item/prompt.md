# Documentation Fix

**Subagent:** documentation-expert
**Goal:** {{GOAL}}

A prior documentation attempt failed verification. Triage has identified the root cause.

**Hard Rules**
1. All output must be a direct instruction set *to* documentation-expert — not meta-commentary.
2. Call the `agent` tool with `subagent_type=documentation-expert`.
3. Documentation-expert is limited to documentation files only — never instruct it to make code changes.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the triage root cause, prior fix attempts and why they failed, verified code facts as source-of-truth, and documentation conventions.

2. **Prompt Drafting:** Draft the prompt for documentation-expert. Include: the fix goal (`{{GOAL}}`), the root cause to address, verified technical facts as mandatory source-of-truth, what prior attempts already tried (to prevent repetition), return format requirements, and web search instructions (do not omit — documentation-expert can and should perform web searches when needed).

3. **Delegation Gate:** Before calling `agent`, verify: prompt addresses documentation-expert directly, web search instructions are included, retrieved context is integrated, return format is specified, no code changes are requested. Revise if any check fails, then call `agent` with `subagent_type=documentation-expert`.

4. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: what was fixed, files changed, how the root cause was addressed. Add missing notes if needed — the verify step depends on them.

5. Call `next_step`.
