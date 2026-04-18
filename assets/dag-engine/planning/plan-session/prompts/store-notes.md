**Plan Name:** {{PLAN_NAME}}
**Required Tools:** qdrant-store

**Objective:** Persist all critical, non-procedural findings from the investigation phases as semantic notes in `collection_name={{PLAN_NAME}}`.

**What to cover:**
- **Findings:** Definitive conclusions from research and scouting, with relevance to the plan goal.
- **Unknowns:** Unresolved questions or gaps that impede planning and require future investigation.
- **Constraints:** External or internal limitations that restrict the viable design space of the plan.
- **Goal scope:** How the user's goal and scope were refined during investigation.

**Note standards:**
- Each note must be self-contained prose — a future agent reading only that note must fully understand it without access to the full investigation log.
- Notes describe *what* was discovered and *what* it implies for plan structure.
- Never store procedural details, command sequences, or execution logs.

**Instructions:**
1. For each distinct finding, unknown, or constraint: call `qdrant-store` with `collection_name={{PLAN_NAME}}`. One call per note.
2. Call `next_step`.
