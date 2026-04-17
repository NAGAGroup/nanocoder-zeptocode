Objective: Project Orientation and Planning Context Scrutiny
Scope: To conduct a thorough initial survey of the current project state using a specialized context-scouting subagent to ensure comprehensive project orientation before proceeding to planning.
Input Context: Project details and constraints associated with the identifier `{{PLAN_NAME}}`.
Quality Threshold: The operation is considered successful only if the final Gate validation confirms that all findings and unknowns have been adequately captured in distinct, verifiable notes within the specified collection.

Procedure:
1.  **Preflight Data Retrieval:** Access and synthesize two core data sets from the project context, `{{PLAN_NAME}}`:
    *   Data Set 1: The user's overall goal and specific request.
    *   Data Set 2: Project constraints and the user's desired level of involvement.
    *   Internal Preparation: Based on the retrieved context, define the scope, target topics, and required report structure for the scouting delegation.
2.  **Delegation (Context-Scout):** Formulate a highly structured prompt directed *to* the context-scout subagent using the `agent` tool. This prompt must leverage the Preflight data and clearly instruct the subagent on the desired output format, content focus, and specific exclusions.
3.  **Information Synthesis and Storage:** Upon receiving the context-scout's report, the findings must not be stored monolithically. Instead, categorize the report into distinct, logically separated notes. Each distinct note must be stored individually within the `{{PLAN_NAME}}` collection.
4.  **Gate Validation:** Perform a final verification check based on the collected notes. This check must confirm:
    *   All surfaced findings are accurately summarized.
    *   All remaining unknowns or gaps are clearly identified.
    *   The total count of distinct notes stored (`qdrant_store_note_count`) is sufficient to cover the scope.
    *   The collection used for storage is correctly identified as `{{PLAN_NAME}}`.

Output Requirement:
The final output must be a validated status report, including:
*   `findings`: A concise, summarized list of all positive findings from the context survey.
*   `unknowns`: A concise summary of all identified gaps or unresolved ambiguities.
*   `gate_passed`: A boolean status (True/False) indicating successful completion and adherence to storage and validation standards.

Action Protocol: Do not proceed to the next planning stage until the Gate Validation phase confirms a `gate_passed = True`. If the gate fails, immediately correct the note-taking deficiency before re-validation.
