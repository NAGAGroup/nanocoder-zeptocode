---
description: "Activate an execution plan produced by a planning session"
parameters: [plan_name]
---

# Activate Plan

You are starting the execution of a plan. The plan name is:

"{{plan_name}}"

## Hard Rules (violating any = task failure)
1. Load the following-plans skill before doing anything else.
2. Execute the plan exactly as designed. Do not modify scope, skip steps, or work ahead.

## Preflight (fill out before continuing)

```toml
[preflight]
plan_name = <the plan name from {{plan_name}} verbatim>
ready_to_execute = <true/false — do you have what you need to begin?>
```

## Activation Protocol

1. Load the `following-plans` skill.
2. Complete the preflight above.

## Gate (fill out before calling activate_plan)

```toml
[gate]
following_plans_skill_loaded = <true/false>
preflight_complete = <true/false>
gate_passed = <true/false>
```

## How to Proceed

Call `activate_plan` with plan name `{{plan_name}}` once your gate passes. The execution DAG will guide you through every subsequent step.
