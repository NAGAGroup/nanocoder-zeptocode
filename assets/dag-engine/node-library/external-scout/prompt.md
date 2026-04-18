# Web Search

**Subagent:** external-scout
**Goal:** Research the following questions online: {{DESCRIPTION}}

## Hard Rules

1. Write your prompt as instructions *to* external-scout — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=external-scout`.

## Preflight Checks

```
[preflight]
subagent_type = external-scout
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve what is already known and what project constraints apply (language versions, existing dependencies, exclusions).
2. Draft a prompt for external-scout that includes: the research questions, what prior steps already established (so external-scout fills gaps, not duplicates), project constraints the research must account for, and reporting requirements (confidence tags, sources, contradictions).

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
prompt_includes_project_constraints = <true/false — language versions, existing deps, and exclusions stated>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Categorize the report into distinct notes — one per question or finding area. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: findings per question tagged with confidence level, unknowns that couldn't be resolved, sources consulted.

```toml
[note-gate]
notes_stored = <list each note topic>
confidence_tags_captured = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding.

## How to Proceed

Call `next_step`.
