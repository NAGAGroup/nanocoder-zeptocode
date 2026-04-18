# Triage

**Subagent:** tailwrench
**Goal:** {{GOAL}}

Verification failed. Delegate tailwrench to identify the root cause and apply fixes to project setup. Tailwrench can run shell commands and edit config/build files — never source code or documentation.

**Hard Rules**
1. Write your prompt as direct instructions *to* tailwrench — not commentary about it.
2. Call the `agent` tool with `subagent_type=tailwrench`.
3. Tailwrench is limited to shell commands and config/build file edits — never source code or documentation.
4. The exact failed commands and verbatim error output must be in the prompt — tailwrench needs them to reproduce the failure.
5. Always instruct tailwrench to verify that its edits were applied correctly.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the verbatim verification failure output, exact failed commands, and any prior triage findings from earlier retry cycles.

2. **Prompt Drafting:** Draft a prompt *to* tailwrench that includes: the exact failed commands and verbatim error output to reproduce the failure, prior triage findings to avoid repeating, what tailwrench can and cannot touch, and what to report back (reproduction output, root cause, fixes applied, fix step instructions). Include the following verbatim web search instruction — do not modify it: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

3. **Delegation Gate:** Before calling `agent`, verify: prompt addresses tailwrench directly, verbatim web search instruction is included, retrieved context is integrated, return format is specified, verbatim failure output is included (not summarized), triage report instructions are complete. Revise if any check fails, then call `agent` with `subagent_type=tailwrench`.

4. **Note Taking:** Categorize the triage report. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: root cause, project-level fixes applied, specific fix instructions for the next step. If root cause is vague or fix instructions are missing, revise before proceeding.

5. Call `next_step`.
