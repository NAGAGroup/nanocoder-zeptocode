# Triage
**Subagent:** tailwrench

Verification failed. Triage is needed to identify the root cause and apply fixes to the project setup to resolve the issue. Tailwrench will be delegated to perform this triage, leveraging its ability to run shell commands, edit config/build files, and conduct web searches to investigate and fix project setup issues.

## Hard Rules

1. Write your prompt as instructions *to* tailwrench — treat it as a message to another agent.
2. Call the `agent` tool with `subagent_type=tailwrench`.
3. Tailwrench can only run shell commands and edit config and build system files — never source code or documentation.
4. The exact failed commands and verbatim error output must be in the prompt — tailwrench needs them to reproduce the failure.
5. In addition to the verification target above, always instruct tailwrench to verify the intended edits were made as well.

## Preflight Checks

```
[preflight]
subagent_type = tailwrench
description = <3-5 word description of the task>
```

## Prepare Delegation Protocol

1. Call `qdrant-find` with `collection_name={{PLAN_NAME}}`, as needed, to retrieve the verbatim verification failure output, exact failed commands, and any prior triage findings from earlier retry cycles.
2. Draft a prompt for tailwrench that includes: the exact failed commands and error output to reproduce, prior triage findings to avoid repeating, what tailwrench can and cannot touch, and what to report back (reproduction output, root cause, fixes applied, what the fix step must address).
3. Include instructions to perform web search as they work, if specified. They *can* perform their own web search, instructions to perform web search are valid. Do not exclude web search instructions. Instructions to include, *verbatim* and *nothing more/nothing less*: "Use web search tools as you work, e.g. API docs, build system integration, best practices, headers, user guides, etc. Never assume prior knowledge or provided context is enough. Verify everything."
4. Do not, under any circumstances, modify the web search instructions above if they are to be included.

## Delegation Gate

```toml
[delegation-gate]
prompt_addresses_subagent_directly = <true/false>
prompt_includes_web_search_instructions = <true/false>
prompt_includes_retrieved_context = <true/false>
prompt_specifies_return_format = <true/false>
verbatim_failure_output_included = <true/false — exact failed commands and error output are in the prompt, not summarized>
triage_instructions_included = <true/false — instructions for what tailwrench should report back, including reproduction output, root cause, fixes applied, and fix step instructions>
gate_passed = <true/false>
```

If `gate_passed` is false, revise before delegating. Once it passes, call the `agent` tool.

## Note Taking

Categorize the triage report. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` once per note.

At minimum, capture: root cause, project-level fixes applied, specific fix instructions for the next step.

```toml
[note-gate]
notes_stored = <list each note topic>
fix_instructions_captured = <true/false — root cause and fix instructions specific enough for the fix step to act on>
gate_passed = <true/false>
```

If `gate_passed` is false, root cause is vague or fix instructions are missing — revise before proceeding.

## How to Proceed

Call `next_step`.
