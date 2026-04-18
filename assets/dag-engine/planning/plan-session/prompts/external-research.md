# External Research

Delegate an external-scout subagent using the `agent` tool to perform web search to inform planning decisions.

Do not use this step to solve execution-phase problems. Scope is restricted to surveying the landscape of options and approaches that will be decided on during plan execution — not specific implementation details or API docs.

**Hard Rules**
1. Write your prompt as instructions *to* external-scout — treat it as a direct message to the agent, not commentary about it.
2. Use structured formatting in your prompt (sections, lists) — not dense text.
3. Specify how you want external-scout to report back: structure, content, what to exclude.
4. Never ask external-scout for specific implementation details or API/user docs. Survey the landscape of options only.

**Execution Steps:**

1. **Preflight:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve the user's goal, constraints, and orientation findings from prior steps. Determine what to query based on what's useful to inform the delegation. Assess whether external research is actually needed to inform planning decisions.

2. **If research is not needed:** Confirm with the user first. Then call `agent` instructing external-scout that no research is needed and it can return immediately.

3. **If research is needed:** Construct a structured prompt for external-scout that defines: the research questions and topics, what prior steps already established (so external-scout fills gaps, not duplicates), project constraints the research must account for, and reporting requirements. Call `agent` with `subagent_type=external-scout`, the structured `prompt`, and a `description`.

4. **Note Taking:** Categorize the report into distinct notes. Call `qdrant-store` for each distinct note using `collection_name={{PLAN_NAME}}`. Do not store as a monolithic note — it makes discoverability harder.

5. **Gate:** Verify before calling `next_step`:
   - Notes were stored as distinct entries using `collection_name={{PLAN_NAME}}`.
   - Findings and unknowns are captured.
   If the gate fails, add missing notes. Proceed immediately — do not wait for user instruction.
