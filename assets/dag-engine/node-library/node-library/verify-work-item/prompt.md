# Verify

**Subagent:** tailwrench
**Goal:** {{GOAL}}
**Success criteria:** {{VERIFY_DESCRIPTION}}

Tailwrench is restricted to command execution and output reading — it cannot edit any files.

**Execution Steps:**

1. **Context Retrieval:** Use `qdrant-find` with `collection_name={{PLAN_NAME}}` to retrieve: the implementation summary, files changed, and any prior verification failure output from earlier cycles.

2. **Prompt Drafting:** Construct a prompt *to* tailwrench that includes: what was implemented (from notes), the success criteria (`{{VERIFY_DESCRIPTION}}`), prior failed commands to avoid repeating, and the required return format: commands run, full output, pass/fail verdict, and on failure — exact error output and which criteria failed.

3. **Delegation Gate:** Before calling `agent`, verify: prompt addresses tailwrench directly, retrieved context is included, success criteria are stated, return format is specified. Revise if any check fails, then call `agent` with `subagent_type=tailwrench`.

4. **Note Taking:** Call `qdrant-store` with `collection_name={{PLAN_NAME}}`. At minimum capture: verdict (pass/fail), commands run, and on failure — exact error output and which criteria failed. Store missing details if needed.

5. **Branch:** Call `get_branch_options` to retrieve available branch node IDs.
   - **PASS:** Call `next_step` with the success branch node ID.
   - **FAIL:** Call `next_step` with the triage branch node ID.
   
   Both outcomes require a branch argument — `next_step` cannot be called without one.
