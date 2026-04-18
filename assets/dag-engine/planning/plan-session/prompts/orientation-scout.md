# Project Orientation

Delegate a context-scout subagent using the `agent` tool to survey the current project and orient the planning process.

**Hard Rules**
1. Write your prompt as instructions *to* context-scout — treat it as a direct message to the agent, not commentary about it.
2. Use structured formatting in your prompt (sections, lists) — not dense text.
3. Specify how you want context-scout to report back: structure, content, what to exclude.

**Execution Steps:**

1. **Preflight:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve what you need to understand the user's goal and constraints. Decide what to query based on what's useful to inform the delegation.

2. **Delegation:** Based on the retrieved context, construct a structured prompt for context-scout that defines: the survey scope and specific topics/questions to investigate, any retrieved context that scopes or prioritizes the survey, and clear reporting requirements. Call `agent` with `subagent_type=context-scout`, the structured `prompt`, and a `description`.

3. **Note Taking:** Once context-scout responds, categorize the report into distinct notes. Call `qdrant-store` for each distinct note using `collection_name={{PLAN_NAME}}`. Do not store as a monolithic note — it makes discoverability harder.

4. **Gate:** Verify before calling `next_step`:
   - Notes were stored as distinct entries using `collection_name={{PLAN_NAME}}`.
   - Findings and unknowns from the survey are captured.
   If the gate fails, add missing notes. Proceed immediately — do not wait for user instruction.
