# Documentation

**Subagent:** documentation-expert
**Goal:** {{GOAL}}

## Hard Rules

1. Write your prompt as instructions *to* documentation-expert — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=documentation-expert`.
3. Documentation-expert can only edit documentation files — never ask it to make code changes.

## Preflight Checks

```
[preflight]
subagent_type = documentation-expert
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve verified code facts, API shapes, behavioral findings, and documentation conventions from prior steps.
2. Draft a prompt for documentation-expert that includes: the documentation goal, verified technical facts it must use as source-of-truth, documentation conventions to follow, and what to report back.
3. Include web search instructions verbatim: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_web_search_instructions = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
prompt_no_code_changes = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: what was written, files changed, any decisions or assumptions that downstream steps should know about.

```toml
[note-gate]
notes_stored = <list each note topic>
files_changed_captured = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding.

## How to Proceed

Call `next_step`.
