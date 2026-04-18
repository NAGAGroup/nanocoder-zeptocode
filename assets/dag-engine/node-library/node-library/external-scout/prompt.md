# Web Search Operation: External Scout Delegation

**Subagent:** external-scout
**Goal:** Research the following questions online: {{DESCRIPTION}}

**Hard Rules**
1. Write your prompt as instructions *to* external-scout — treat it as a message to another agent, not commentary about it.
2. Call the `agent` tool with `subagent_type=external-scout`.

**Execution Steps:**

1. **Preflight:** Generate a concise 3-5 word `description` summarizing the research task. Confirm scope is defined by `{{DESCRIPTION}}`.

2. **Context Retrieval:** Execute `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve existing documentation, known project constraints (language versions, dependencies, exclusions), and prior findings related to the scope.

3. **Prompt Drafting:** Draft a direct, actionable instruction set for external-scout. Include: the full research questions, a summary of prior context (to prevent redundant research), all project constraints, and reporting requirements — confidence tags (High/Medium/Low) for every finding, sources consulted, and unresolved unknowns.

4. **Delegation Gate:** Before calling `agent`, verify:
   - Prompt addresses external-scout directly
   - Retrieved context is included
   - Return format is specified
   - Project constraints (language versions, deps, exclusions) are stated
   Revise if any check fails. Once all pass, call `agent` with `subagent_type=external-scout`.

5. **Note Taking:** Categorize the report into distinct notes — one per question or finding area. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note. Each note must capture: the finding, confidence tag, unresolved unknowns, and sources consulted. If notes are insufficient, add more before proceeding.

6. Call `next_step`.
