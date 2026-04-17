# Code Implementation

**Subagent:** junior-dev
**Goal:** {{GOAL}}

## Hard Rules

1. Write your prompt as instructions *to* junior-dev — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=junior-dev`.
3. Do not ask junior-dev to run build, test, or any verification commands — a dedicated verify step runs after this node.

## Preflight Checks

```
[preflight]
subagent_type = junior-dev
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant_qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve research findings, code conventions, architectural decisions, and constraints from prior steps.
2. Draft a prompt for junior-dev that includes: the implementation goal, prior research context, and what to report back (what was implemented, files changed, decisions made).
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

Categorize the report into distinct notes. Call `qdrant_qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: what was implemented, files changed, and any decisions that affect verification.

```toml
[note-gate]
notes_stored = <list each note topic>
implementation_captured = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding. The verify step depends on these notes.

## How to Proceed

Call `next_step`.
