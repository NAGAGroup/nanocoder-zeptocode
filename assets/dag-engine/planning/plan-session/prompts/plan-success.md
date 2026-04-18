# Plan Creation Successful

Execute the final steps of the planning session in order:

1. **Store context:** Call `qdrant-store` with `collection_name={{PLAN_NAME}}` to persist core planning decisions, rationale, and reasoning. Make the calls count — this is the context the executing agent will rely on.
2. **Summarize and present:** Summarize the planning session to the user — what was created and why. Then call `present_plan_diagram` with `plan_name={{PLAN_NAME}}` to give the user a visual of the plan flow.
3. **User decision:** Use the `question` tool to present two options: activate now or defer to later.
4. **Execute the choice:**
   - Activate: call `activate_plan` with `{{PLAN_NAME}}` — this immediately begins DAG execution.
   - Defer: call `next_step` to exit the planning session.
