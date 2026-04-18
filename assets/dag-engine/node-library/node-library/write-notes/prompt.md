# Write Notes

**Goal:** Store durable session notes covering this point in the plan.
**What to document:** {{DESCRIPTION}}

**Hard Rules**
1. Each note must be self-contained — a future agent reading only that note must fully understand it without surrounding context.
2. One `qdrant-store` call per distinct finding — never store as a monolithic block.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve findings from prior steps relevant to what `{{DESCRIPTION}}` asks you to document.

2. **Store Notes:** For each distinct finding, decision, or outcome: call `qdrant-store` with `collection_name={{PLAN_NAME}}`. Write each note as self-contained prose — a future agent reading only that note must achieve full contextual comprehension without reference to prior steps.

3. **Self-Contained Check:** Review each stored note. If any note is shallow or would require surrounding context to understand, rewrite it before proceeding.

4. Call `next_step`.
