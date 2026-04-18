# Creating the Plan

Craft a plan as an executable DAG of phase types. The plan will be locked in by calling `create_plan`.

Do not activate the plan — this step only produces and locks in the plan.

**Hard Rules**
1. Every plan has exactly one entry point — the phase not referenced in any other phase's `next` field.
2. Every phase must define `next`. Use `next = []` for leaf/exit phases.
3. Only `agentic-decision-gate` and `user-decision-gate` may have multiple entries in `next`.
4. Work through the protocol completely before calling `create_plan`. Do not skip parts.

## Preflight

1. Call `get_planning_schema`, this will return all the possible phase types you can use in a plan.
2. Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve the user's goal and all relevant findings from prior exploratory steps. Determine what to query to fully understand the goal, constraints, and prior research.
3. Using the `planning-schema` skill as the definitive reference, establish:
   - All available phase types with a brief description of each.
   - Which phase types may have multiple `next` entries.
   - Which phase types bundle internal research/setup (so standalone research phases aren't needed before them).
   - The user's core goal in one sentence.
   - 3-5 critical findings from prior steps.
   - Collaboration signal: "autonomous" | "collaborative" | "unclear".
   - Whether external dependencies (libraries, frameworks, APIs) are involved.
4. If `collaboration_signal = "unclear"`, use the `question` tool now to resolve it before continuing.

## Part 1: Identify Work and Decisions

Identify these together — they shape each other:

- **Work items** — distinct implementation tasks, tightly scoped. Every `implement-code` phase touching external dependencies must include `web-search-questions` and the instructions field must explicitly state that external dependencies are involved and that junior-dev should perform its own web searches as it works.
- **Verification** — for each work item, specify concrete success criteria: build commands, test commands, visual checks, API responses, etc. The executing agent uses exactly what you write here.
- **Decisions** — things that must be decided during execution. Note who decides (agent or user) and whether the decision changes *what* gets implemented downstream.
  - Decision that changes what gets implemented → gate that branches into distinct pathways.
  - Decision that only affects details → handle inline with `write-notes` or `user-discussion`, no branching.

List: each work item and scope, verification method per item, branching decisions with gate type and branches, inline decisions, and collaboration phases planned.

## Part 2: Early Exits

Identify points where execution could discover early completion, a dead end, or a need to pivot. For each, note the trigger and which decision gate routes to an `early-exit` phase.

## Part 3: Draft the TOML

Write the full plan in TOML using your answers from Preflight and Parts 1-2 directly — don't re-derive. Present the draft, then verify all of the following before proceeding:

- Exactly one entry point (no other phase points to it via `next`).
- Every phase has a `next` field.
- Only gates have multiple `next` entries.
- Every `implement-code` phase with external deps has `web-search-questions` and explicit web search verbiage in instructions.
- Every `implement-code` phase has `verification-instructions` with concrete commands and criteria.
- Every branching decision from Part 1 appears as a gate.
- Every early exit from Part 2 appears as a leaf.
- Every collaboration phase from Part 1 appears in the plan.

Once all checks pass, call `create_plan` with `plan_name={{PLAN_NAME}}` and the full TOML plan. On errors, read them and retry.

Once `create_plan` succeeds, call `next_step` immediately.
