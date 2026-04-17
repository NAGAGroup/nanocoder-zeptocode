# Creating the Plan

Craft a plan as an executable DAG of phase types. The plan will be locked in by calling `create_plan`.

Do not activate the plan — this step only produces and locks in the plan.

## Hard Rules (violating any = task failure)

1. Every plan has exactly one entry point — the phase not referenced in any other phase's `next` field.
2. Every phase must define `next`. Use `next = []` for leaf/exit phases.
3. Only `agentic-decision-gate` and `user-decision-gate` may have multiple entries in `next`.
4. Work through the protocol completely before calling `create_plan`. Do not skip parts.

## Preflight

1. Call `get_planning_schema` to load the phase type reference.
2. Call `qdrant_qdrant-find` with `collection_name={{PLAN_NAME}}` and query "user goal and request".
3. Call `qdrant_qdrant-find` with `collection_name={{PLAN_NAME}}` using 5-7 varied queries to retrieve findings from exploratory steps.
4. Use the `get_planning_schema` output as your reference for the phase type fields. Phase types can be used multiple times. Nested branching is allowed. Branches need not merge, every leaf phase is considered a valid exit.

```toml
[preflight]
plan_name = {{PLAN_NAME}}
available_phase_types = <list every phase type from the get_planning_schema output, one per line, with a 3-8 word description of what it's for>
branching_phase_types = <list of phase types that may have multiple entries in next — per hard rule 3>
phases_with_built_in_prework = <list of phase types that bundle research and setup into themselves, so standalone research phases aren't needed before them>
user_goal = <one sentence>
key_findings = <3-5 bullet points of the most relevant findings for planning>
collaboration_signal = <what did the user say about their involvement? "autonomous" | "collaborative" | "unclear">
external_dependencies = <true/false — does this involve external libraries, frameworks, or APIs?>
gate_passed = <true/false>
```

If `collaboration_signal = "unclear"`, use the `ask_user` tool now to resolve it before continuing.

## Part 1: Identify Work and Decisions

Identify these things together, because they shape each other:

- **Decisions/Discussion** — things that must be decided during execution. For each decision, note who decides (agent or user) and whether the decision changes *what* gets implemented downstream.
- **Work items** — distinct implementation tasks, don't cram a ton of work into a single phase. Keep each tightly scoped. Every `implement-code` phase touching external dependencies must have `web-search-questions` and the instructions fields should explicitly state that external dependencies are involved and that junior-dev should perform its own web searches as it works to ensure correctness.
- **Verification** — how will the work be verified? Junior-dev runs verification itself after implementing. Specify success criteria and any concrete checks: build commands, test commands, visual checks, API responses, etc. Be explicit — junior-dev uses exactly what you write here.

A decision that changes what gets implemented → a gate that branches into distinct pathways.
A decision that only affects details of a work item → no branching; handle with `write-notes` or `user-discussion`.

```toml
[work-decisions-gate]
work_items = <list: each item's scope in one line>
verification_instructions = <list: each item's verification method in one line, matching the order of work_items>
branching_decisions = <list: which decisions branch the DAG, gate type, and what the branches are — "none" if none>
non_branching_decisions = <list: which decisions are handled in-line with write-notes or user-discussion — "none" if none>
collaboration_phases = <list: user-discussion and user-decision-gate phases planned, based on collaboration_signal — "none" if autonomous>
gate_passed = <true/false>
```

## Part 2: Early Exits

Identify points where execution could discover early completion, a dead end, or a need to pivot. Add exit branches at those points leading to `early-exit` phases.

```toml
[exits-gate]
early_exits = <list: each exit's trigger and which decision gate leads to it — "none" if none>
gate_passed = <true/false>
```

## Part 3: Draft the TOML

Write the full plan in TOML. Use your answers from the preflight and Parts 1-2 directly — don't re-derive them. As you write, the DAG shape will become concrete: entry point, sequential work, branches, merges, exits.

Present the draft.

```toml
[draft-gate]
single_entry_point = <true/false — exactly one phase has no phase pointing to it via next>
all_phases_have_next_field = <true/false>
only_gates_have_multi_next = <true/false>
every_implement_code_phase_with_external_deps_has_web_search_questions = <true/false>
every_implement_code_phase_instructions_include_explicit_web_search_verbiage = <true/false — junior-dev must be told to search as it works when external deps are involved>
every_implement_code_phase_has_verification_instructions = <true/false — verification-instructions field is populated with concrete commands and criteria>
every_branching_decision_from_part_1_appears_as_a_gate = <true/false>
every_early_exit_from_part_2_appears_as_a_leaf = <true/false>
every_collaboration_phase_from_part_1_appears_in_the_plan = <true/false>
gate_passed = <true/false — all above are true>
```

## How to Proceed

Once `draft-gate.gate_passed = true`, call `create_plan` with `plan_name={{PLAN_NAME}}` and the full TOML plan. On errors, read them and retry.

Once `create_plan` succeeds, call `next_step` immediately.

