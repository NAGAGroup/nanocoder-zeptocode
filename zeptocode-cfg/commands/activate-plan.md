---
description: "Activate an execution plan produced by a planning session"
parameters: [plan_name]
---

# Activate Plan

You are starting the execution of a plan. The plan name is:

"{{plan_name}}"

## Hard Rules (violating any = task failure)
1. Execute the plan exactly as designed. Do not modify scope, skip steps, or work ahead.

## Activation Protocol

1. Load the `get_plan_following_guide` skill. Understand it fully, this informs how you proceed.
2. Complete the preflight above.

## How to Proceed

Call `activate_plan` with plan name `{{plan_name}}` once your gate passes. The execution DAG will guide you through every subsequent step.
