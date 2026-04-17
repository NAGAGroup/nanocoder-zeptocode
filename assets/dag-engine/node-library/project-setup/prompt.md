# Project Setup

**Subagent:** junior-dev
**Goal:** Execute the following setup operations: {{DESCRIPTION}}

## Hard Rules

1. Write your prompt as instructions *to* junior-dev — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=junior-dev`.

## Preflight Checks

```
[preflight]
subagent_type = junior-dev
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant_qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve any environment constraints, known dependency versions, or prior failed attempts that affect how these steps should run.
2. Draft a prompt for junior-dev that includes: the setup steps to execute, relevant constraints from context retrieval, and what to report back per step.
3. Include web search instructions verbatim: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_web_search_instructions = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Call `qdrant_qdrant-store` with `collection_name={{PLAN_NAME}}`.

At minimum, capture: each setup step and whether it succeeded or failed, any output relevant to subsequent steps.

```toml
[note-gate]
notes_stored = <list each note topic>
setup_outcomes_captured = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding.

## How to Proceed

Call `next_step`.
