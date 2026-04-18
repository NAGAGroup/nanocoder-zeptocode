# Execution Kickoff

You are entering an execution session. A complete planning session has already finalized the goal, gathered research, determined constraints, and produced the executable plan. Your sole responsibility is to orient to this existing plan and execute it — not re-plan or re-derive any decisions. All planning artifacts are stored in the Qdrant collection for this plan.

**Hard Rules**
1. Never re-plan or re-derive decisions made during planning. The stored plan is the definitive truth.
2. At every step, perform only what the current DAG node mandates — do not deviate or get ahead.
3. When delegating to subagents, explicitly surface the accumulated session context. Subagents do not have full session visibility — it is your responsibility to surface what they need.

**Mandatory Preflight (sequential):**

1. Call `present_plan_diagram` with `{{PLAN_NAME}}` to review the full execution plan structure.
2. Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve the full planning context: user request and goal, research findings, decisions made, architectural constraints, and any other context needed to fully orient to the plan.
3. Call `qdrant-store` with `collection_name={{PLAN_NAME}}` and store a note summarizing the execution session start — the user's goal, constraints, and key context all subsequent steps should be aware of. Prefix with `[EXECUTION CONTEXT]: `.

**Gate:** Before calling `next_step`, verify:
- Planning context was retrieved and is sufficient to proceed.
- Execution context note was stored.

If either check fails, resolve it first. Do not wait for user instruction — the DAG guides each step.
