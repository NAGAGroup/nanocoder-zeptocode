# Agentic Decision

**Goal:** Route execution to the appropriate branch.
**Decision question:** {{DESCRIPTION}}

**Hard Rules**
1. Routing must be grounded in retrieved evidence — never guess.
2. Call `get_branch_options` before `next_step`.
3. Do not call `next_step` until the decision gate is fully resolved.

**Execution Steps:**

1. **Evidence Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve evidence relevant to `{{DESCRIPTION}}`.
2. **Branch Identification:** Call `get_branch_options` to obtain all available branch node IDs.
3. **Evaluate and Decide:** Systematically compare the retrieved evidence against the decision question. Select the branch maximally supported by the evidence. Rationale must cite specific findings — not general reasoning.

Once the decision is made and the rationale is grounded in evidence, call `next_step` with the selected branch node ID.
