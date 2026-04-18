# Project Survey

**Subagent:** context-scout
**Goal:** {{DESCRIPTION}}

**Hard Rules**
1. Output must be framed strictly as instructions directed *to* context-scout — not commentary about it.
2. Call the `task` tool with `subagent_type=context-scout`.
3. Context-scout is limited to project source files only — do not ask it to search the web or reference external knowledge.

## Preflight

```
[preflight]
subagent_type = context-scout
description = <3-5 word description of the task>
```

## Delegation Protocol

1. Use `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve prior findings or planning context that should inform what context-scout focuses on.
2. Draft a prompt for context-scout that includes: the survey goals, any retrieved context that scopes or prioritizes the survey, and clear reporting requirements.

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
prompt_stays_within_project_source = <true/false — prompt does not ask context-scout to search the web>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `task` tool.

## Note Taking

Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: findings by category, gaps and unknowns, follow-ups flagged for deeper analysis.

```toml
[note-gate]
notes_stored = <list each note topic>
findings_and_gaps_captured = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding.

## How to Proceed

Call `next_step`.
