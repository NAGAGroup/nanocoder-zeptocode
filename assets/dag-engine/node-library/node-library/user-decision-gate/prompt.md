# User Decision

**Goal:** Present findings to the user and route based on their choice.
**Decision question:** {{DESCRIPTION}}

**Hard Rules**
1. Surface relevant prior findings before presenting the choice — never ask the user to decide cold.
2. Describe what each branch means concretely — not just its ID.
3. Tool sequence is strictly: `qdrant-find` → `get_branch_options` → `question`.
4. Do not call `next_step` until the user has chosen and the decision is recorded.

**Execution Steps:**

1. **Evidence Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve evidence relevant to `{{DESCRIPTION}}`.

2. **Branch Identification:** Call `get_branch_options` to obtain all available branch node IDs.

3. **Present Choice:** Use the `question` tool. Include:
   - A plain-language summary of the retrieved evidence.
   - A concrete explanation of what each branch means for the execution ahead (not just the ID).
   - The decision question (`{{DESCRIPTION}}`).

4. Once the user chooses, call `next_step` with the matching branch node ID.
