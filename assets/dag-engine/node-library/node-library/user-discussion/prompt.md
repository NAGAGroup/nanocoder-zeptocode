# User Discussion

**Goal:** Discuss the following topic with the user and capture key outcomes.
**Topic:** {{DESCRIPTION}}

**Hard Rules**
1. Retrieve and surface prior findings before opening the discussion — never start cold.
2. Use the `question` tool to structure the conversation.
3. Store every key outcome before calling `next_step`.

**Desired Outcomes:** Define what must be established by the end of this discussion to proceed.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve prior findings relevant to `{{DESCRIPTION}}`.

2. **Open Discussion:** Use the `question` tool. The opening must include a concise summary of relevant prior findings before your first question.

3. **Iterative Dialogue:** Continue using the `question` tool until all desired outcomes are resolved. Each question must be designed to resolve a specific required outcome.

4. **Capture Outcomes:** For each key outcome or decision confirmed by the user, immediately call `qdrant-store` with `collection_name={{PLAN_NAME}}`.

5. The dialogue only ends when all desired outcomes are established and stored. Call `next_step`.
