# User Discussion

**Goal:** Discuss the following topic with the user and capture key outcomes.
**Topic:** {{DESCRIPTION}}

## Hard Rules

1. Always surface relevant prior findings before opening the discussion — don't start cold.
2. Use the `ask_user` tool to structure the conversation.
3. Store outcomes before calling `next_step`.

## Preflight

```toml
[preflight]
desired_outcomes = <what must be established by the end of this discussion in order to proceed>
```

## Discuss and Capture

1. Call `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve prior findings relevant to this topic.
2. Use the `ask_user` tool to open the discussion. Surface relevant prior findings before your first question.
3. Continue with the `ask_user` tool until `desired_outcomes` are resolved.
4. For each key outcome or decision, call `qdrant-store` with `collection_name={{PLAN_NAME}}`.

## Gate

```toml
[gate]
outcomes_captured = <list each outcome or decision established>
desired_outcomes_met = <true/false>
notes_stored = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, continue the discussion or store missing outcomes before proceeding.

## How to Proceed

Call `next_step`.
