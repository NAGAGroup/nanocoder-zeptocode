# Commit

**Subagent:** tailwrench
**Goal:** Stage and commit the verified work from this phase.

**Hard Rules**
1. Write your prompt as direct instructions *to* tailwrench — not commentary about it.
2. Call the `task` tool with `subagent_type=tailwrench`.
3. Stage only the specific files changed in this work phase — never all changed files indiscriminately.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the implementation summary, the exact list of files changed, and the goal this work implemented.

2. **Prompt Drafting:** Draft a prompt *to* tailwrench that includes: the exact file names to stage (by name, not "stage all"), a commit message detailing what was done and why, and an explicit constraint that only those files are staged.

3. **Delegation Gate:** Before calling `task`, verify: prompt addresses tailwrench directly, retrieved context is integrated, return format is specified, specific files are named (not "stage all"). Revise if any check fails, then call `task` with `subagent_type=tailwrench`.

4. **Note Taking:** Call `qdrant-store` with `collection_name={{PLAN_NAME}}`. At minimum capture: commit success/failure, the commit message used, files staged. Correct missing notes before proceeding.

5. Call `next_step`.
