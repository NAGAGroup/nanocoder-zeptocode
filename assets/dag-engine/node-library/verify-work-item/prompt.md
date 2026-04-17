# Verify

**Subagent:** tailwrench
**Goal:** {{GOAL}}
**Success criteria:** {{VERIFY_DESCRIPTION}}

## Hard Rules

1. Write your prompt as instructions *to* tailwrench — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=tailwrench`.
3. Tailwrench can only run commands and read output — it cannot edit any files.

## Preflight Checks

```
[preflight]
subagent_type = tailwrench
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant_qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve the implementation summary, files changed, and any prior verification failure output from earlier cycles.
2. Draft a prompt for tailwrench that includes: what was implemented (from notes), the success criteria to verify against, any prior failures to avoid re-running the same failing commands, and what to report back (commands run, full output, pass/fail verdict, and on failure — exact error output and which criteria failed).

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_includes_success_criteria = <true/false>
prompt_specifies_return_format = <true/false>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Call `qdrant_qdrant-store` with `collection_name={{PLAN_NAME}}`.

At minimum, capture: verdict (pass/fail), commands run, and on failure — exact error output and which criteria failed.

```toml
[note-gate]
notes_stored = <list each note topic>
verdict_captured = <true/false — includes pass/fail and exact error output on failure>
gate_passed = <true/false>
```

If `gate_passed` is false, store missing details before proceeding.

## How to Proceed

Call `get_branch_options` to retrieve the available branch node IDs.

- **If verdict is PASS:** Call `next_step` with the success branch node ID.
- **If verdict is FAIL:** Call `next_step` with the triage branch node ID.

Both outcomes require a branch argument — `next_step` cannot be called without one.
