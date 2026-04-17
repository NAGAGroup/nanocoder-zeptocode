# Planning Session Protocol: Request Decomposition

## Objective and Scope
The objective of this session is strictly **Plan Decomposition**, which involves crafting an executable Directed Acyclic Graph (DAG) that defines the necessary steps to address a subsequent user request in a separate session. This session is purely for planning; task execution or problem-solving is strictly prohibited.

## Mandatory Constraints (Failure Conditions)
1.  **No Execution:** Never execute any tasks or solve the underlying problem within this planning session.
2.  **Strict Adherence:** Adhere precisely to the required steps of the planning DAG. Do not deviate or initiate premature execution, as this compromises plan quality.
3.  **Non-Activation:** Do not initiate or activate the final plan until the decomposition process is complete.

## Input Requirements (Preflight Checklist)
Before beginning the protocol, the following parameters must be defined:
*   `plan_name`: A concise, standardized name for the resulting plan (e.g., `refactor-for-modularity`).
*   `user_request`: A complete and lossless summary of the original user request.
*   `user_involvement`: A boolean (`true`/`false`) indicating if collaboration is required.
*   `user_involvement_nature`: A detailed description of the required collaboration (only if `user_involvement` is true).
*   `constraints`: A summary of all limitations or requirements mentioned in the original request.

## Initialization and Verification Protocol
The planning process requires a sequential execution of the following steps:

### Step 1: Initialization Calls
1.  Call `choose_plan_name` using the determined plan name.
2.  Call `qdrant_qdrant-store` using `collection_name={{PLAN_NAME}}` to store the prefixed user request (`[USER REQUEST]: <summary>`).
3.  Call `qdrant_qdrant-store` using `collection_name={{PLAN_NAME}}` to store the prefixed user involvement data (`[USER INVOLVEMENT]: <data>`).
4.  Call `qdrant_qdrant-store` using `collection_name={{PLAN_NAME}}` to store the prefixed constraints (`[CONSTRAINTS]: <summary>`).

### Step 2: Gate Check
A verification gate must be passed before proceeding. This gate confirms successful execution of Step 1.
*   `choose_plan_name_called`: Boolean confirming the function call was made.
*   `qdrant_store_calls_made`: Integer indicating the total number of required `qdrant_qdrant-store` calls (N=3).
*   `gate_passed`: Boolean, which must be `true` if all required calls and data storage were successful.

## Workflow Progression
If the Gate Check fails (`gate_passed` is false), all identified issues must be corrected before attempting the Gate Check again. Upon successful passing of the Gate Check, proceed immediately by calling `next_step` to continue the plan decomposition workflow.
