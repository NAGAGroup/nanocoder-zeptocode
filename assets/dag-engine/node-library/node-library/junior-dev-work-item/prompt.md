# Code Implementation

**Subagent:** junior-dev
**Goal:** {{GOAL}}

**Hard Rules**
1. All instructions must be directed *to* junior-dev — actionable tasks, not commentary about the process.
2. Call the `agent` tool with `subagent_type=junior-dev`.
3. Explicitly forbid junior-dev from running any build, test, or verification commands — a dedicated verify step runs after this node.

**Execution Steps:**

1. **Preflight:** Generate a concise 3-5 word `description` summarizing the implementation goal.

2. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve prior research findings, established code conventions, architectural decisions, and project constraints.

3. **Prompt Drafting:** Draft a complete prompt for junior-dev that includes: the implementation goal (`{{GOAL}}`), the retrieved prior context, a clearly specified return format (what was implemented, files changed, decisions made), and the following verbatim web search instruction: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

4. **Delegation Gate:** Before calling `agent`, verify: prompt addresses junior-dev directly, web search instructions are included verbatim, retrieved context is integrated, return format is specified. Revise if any check fails, then call `agent` with `subagent_type=junior-dev`.

5. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. At minimum capture: what was implemented, files changed, decisions that affect verification. Add missing notes if needed — the verify step depends on them.

6. Call `next_step`.
