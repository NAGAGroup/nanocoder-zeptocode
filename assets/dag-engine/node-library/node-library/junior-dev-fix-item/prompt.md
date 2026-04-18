# Code Fix

**Subagent:** junior-dev
**Goal:** {{GOAL}}

A prior implementation attempt failed verification. Triage has identified the root cause.

**Hard Rules**
1. All output must be framed as direct instructions addressed *to* junior-dev — not meta-commentary.
2. Call the `task` tool with `subagent_type=junior-dev`.
3. Junior-dev is limited to file edits only — never instruct it to run shell commands or bash operations.

**Execution Steps:**

1. **Preflight:** Define a concise 3-5 word `description` of the fix goal.

2. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the validated triage root cause, all prior fix attempts, the verification failure output, and relevant code conventions.

3. **Prompt Drafting:** Draft the prompt for junior-dev. Include: the fix goal (`{{GOAL}}`), the root cause and required correction, a list of prior failed attempts (to prevent repetition), retrieved code conventions, clear return format instructions, and the following verbatim web search instruction — do not modify it: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

4. **Delegation Gate:** Before calling `task`, verify: prompt addresses junior-dev directly, verbatim web search instruction is included, retrieved context is integrated, return format is specified, no shell commands are requested. Revise if any check fails, then call `task` with `subagent_type=junior-dev`.

5. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: what was fixed, files changed, how the root cause was addressed. Add missing notes if needed — the verify step depends on them.

6. Call `next_step`.
