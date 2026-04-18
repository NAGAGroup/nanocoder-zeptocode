**Plan Name:** {{PLAN_NAME}}
**Required Skills:** None
**Required Tools:** qdrant-find, task
**Optional Tools:** None
**Questions Allowed?:** No

<goal>
{{DESCRIPTION}}

This node is reached only after all retry attempts in a fix→verify sequence have failed.
</goal>

<rules>
Always provide the plan name {{PLAN_NAME}} in your prompt to the subagent.
</rules>

<instructions>
1. Use qdrant-find with collection_name={{PLAN_NAME}}, as needed, to retrieve the full failure history — what was attempted, what specifically failed, and the verification error output.
2. Compose a structured dispatch prompt. Include: the plan name {{PLAN_NAME}}, the original goal from {{DESCRIPTION}}, the complete failure history from step 1 (all attempts, what each tried, why each failed), and an explicit statement that autonomous-agent must not retry approaches already attempted.
3. Dispatch autonomous-agent using the task tool.
4. Call next_step.
</instructions>
