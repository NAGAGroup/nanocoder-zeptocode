# Triage

**Subagent:** junior-dev
**Goal:** {{GOAL}}
**Success criteria:** {{VERIFY_DESCRIPTION}}

Verification failed. Junior-dev will investigate the root cause and apply a fix. A dedicated verify step runs after — do not ask junior-dev to run verification commands.

## Hard Rules

1. Write your prompt as instructions *to* junior-dev — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=junior-dev`.
3. The exact failed commands and verbatim error output must be in the prompt — junior-dev needs them to reproduce and understand the failure.

## Preflight Checks

```
[preflight]
subagent_type = junior-dev
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve the verbatim verification failure output, exact failed commands, and any prior triage findings from earlier retry cycles.
2. Draft a prompt for junior-dev that includes: the original goal, the exact failed commands and error output to reproduce, prior triage attempts to avoid repeating, what to fix and report back (root cause, changes made, files touched).
3. Include web search instructions verbatim: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_web_search_instructions = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
verbatim_failure_output_included = <true/false — exact failed commands and error output are in the prompt, not summarized>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Categorize the report into distinct notes. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: root cause identified, fix applied, files changed.

```toml
[note-gate]
notes_stored = <list each note topic>
root_cause_and_fix_captured = <true/false — root cause and what was changed are recorded>
gate_passed = <true/false>
```

If `gate_passed` is false, add missing notes before proceeding.

## How to Proceed

Call `next_step`.
