---
title: "What I Still Need Before I Call This an Autonomous Factory"
date: 2026-09-12T17:00:00+02:00
tags: [ai, ai engineering, software factory, autonomous agents, orca, workflow, evals, guardrails, dazzhub]
image: hero.png
draft: true
comments: true
toc: true
---

{{< admonition type=tldr title="TL;DR" >}}
I have scheduled agents, isolated worktrees, CI gates, and central traces. I still do not have an autonomous factory. Dispatch, budgets, retry state, path locks, stronger evals, and explicit escalation are missing. I will add them one narrow lane at a time and keep human approval until the evidence says I can safely remove it.
{{< /admonition >}}

My agent server already has a scheduled job. Every hour, Orca checks whether the DazzHub board has capacity. When it does, a backlog groomer may promote one complete issue to `Ready`.

That sounds like an autonomous factory until I look at what happens next.

The card waits. I still start the coding run. The agent opens a pull request, GitHub Actions checks it, and the process waits for me again. I approve before the agent may merge.

I have automated the intake side of the queue. I have not automated dispatch or trust.

{{< admonition type=warning title="Scheduled is not autonomous" >}}
A job running every hour is only a timer. Autonomy starts when the system can select work, stay inside a budget, pass explicit gates, and stop or escalate without me watching it.
{{< /admonition >}}

## What Stage 8 Means in This Setup

The Stage 8 description in Upsun's [eight-stage maturity model](https://upsun.com/blog/8-stages-ai-engineering-maturity/) combines shared infrastructure, scheduled sandboxed runs, centralized traces, recurring jobs, automated eval gates, and escalation.

My setup already satisfies part of the infrastructure requirement. Claude Code, Pi, and Codex run on `dazztronic-box` through Orca. Their work stays on the server in isolated worktrees rather than on my laptop. Langfuse provides the beginning of a central trace store.

The remaining gap has two large parts:

1. **dispatch work without me starting a session;**
2. **let explicit gates decide what may proceed without me.**

Everything else supports those two decisions.

## Ready Refills, but Nothing Drains It

The backlog groomer is intentionally weak. It reads `Backlog`, checks the WIP cap, verifies one ticket against the code, and may move that card to `Ready`. It cannot write code. It cannot claim a card. It cannot touch work already in flight.

The next actor does not exist yet.

A dispatcher needs to:

1. read the `Ready` queue;
2. ignore mis-promoted or already claimed cards;
3. claim one card atomically;
4. read its difficulty tier;
5. select an agent and model budget;
6. create an Orca worktree and worker session;
7. monitor the run until it reaches `In review` or `Blocked`;
8. stop when cost, time, or retry limits are reached.

DazzHub already implements many of these steps inside the interactive issue skill. Moving them into a scheduled run changes their risk. A bad interactive selection wastes my afternoon. A bad dispatcher repeats overnight.

Orca automations can provide the schedule, fresh session, workspace, and precheck. The missing part is the deterministic coordinator around the agent. I do not want a prompt to remember whether a card was claimed or whether attempt four is forbidden.

## The Tier Field Currently Does Nothing

The Groomer writes `cheap`, `standard`, or `deep` to each promoted card. The value describes the work rather than naming a model, so it should survive model releases.

No program consumes it. Right now, the tier is documentation pretending to be policy.

{{< admonition type=note title="A field is not a control" >}}
Writing `cheap`, `standard`, or `deep` onto a card changes nothing until deterministic code maps it to a model, budget, concurrency limit, and retry policy.
{{< /admonition >}}

A Stage 8 dispatcher has to translate that tier into policy. A mechanical documentation change may use a cheaper model and a small token ceiling. Cross-module architecture work may use a stronger model, wider context, and a lower concurrency limit. The mapping belongs in configuration owned by the factory, where I can review and change it.

The tier also needs a budget boundary. Orca can start parallel sessions faster than I can notice a mistake. I need limits per run and across the fleet: wall time, model spend, concurrent workers, and retries. Observability can tell me what a run consumed after the fact. Control has to stop it at the boundary.

## The Workflow Needs an Envelope

Today, state is split across several places:

- GitHub Projects holds the board column, priority, tier, and assignee;
- the issue and pull request hold comments and review decisions;
- Git holds the branch and commits;
- Orca holds sessions and worktrees;
- each agent stores its own transcript;
- the project journal records decisions and dead ends.

The workflow can operate with this arrangement, but it reconstructs some state from history. The pull-request skill counts fix attempts from bot pushes and comments. The issue skill remembers gate retries inside one live session. `touched_paths` exists only as reasoning in a plan, so nothing can lock those paths or prove that the final diff stayed inside them.

I want an immutable envelope per work item. Each phase should produce a new numbered record carrying:

- work item and workflow lane;
- current phase and status;
- attempt count;
- rejection history;
- planned and touched paths;
- gate results;
- model, token, cost, and wall-time data;
- artifact references.

A deterministic orchestrator should be the only writer. Agents return results; they do not advance their own phase. Shape checks validate the envelope before it is stored, and domain gates decide whether the next phase may start.

{{< admonition type=tip title="I learned" >}}
Agents may return results, but they should not move themselves into the next phase. I want one deterministic orchestrator to validate the envelope and decide whether the workflow may continue.
{{< /admonition >}}

Without that envelope, retries and escalation remain conventions distributed across prompts and GitHub history.

## Parallel Work Still Meets at Merge Conflicts

Worktrees isolate filesystems and running agents. They do not prevent two issues from changing the same module.

The backlog groomer currently ranks likely collision-free work higher. That is a useful heuristic with no guarantee behind it. Once plans declare `touched_paths`, the factory can take prefix locks before implementation. The second run should wait before generating a conflicting diff.

Task-level parallelism creates another gate. Five workers can each pass their tests and fail when their changes join. The combined state needs the full gate. If that join fails, the plan or decomposition must handle it; one worker cannot repair an inconsistency it cannot see.

I will add this after the envelope. A lock without a durable record of what owns it becomes another stale file I have to interpret in the morning.

## CI Is a Gate; Evals Are Still Thin

DazzHub has a strong deterministic gate:

- PHPUnit;
- PHPStan with project-specific rules;
- PHP CS Fixer;
- Deptrac;
- GitHub Actions running the same suite;
- focused architecture review before push.

The project has also started testing the skills themselves. The factory suite parses fenced commands and checks board transitions and command usage. That caught drift which grep-based shell guards missed.

This is enough to reject many bad changes. It is not enough to evaluate every judgment the agents make.

Examples still needing stronger evals include:

- Did the agent classify the issue into the correct workflow lane?
- Does a generated spec capture the real acceptance criteria?
- Did the Groomer pick the best next issue rather than the first plausible one?
- Does an architecture review detect logic in the wrong layer when static dependencies remain legal?
- Does a characterization suite cover the behavior that a refactor might remove?

Some can become deterministic checks. New tests should fail against the old implementation. Paths named in a plan should exist. The final diff should stay within approved paths. Mutation testing can measure holes in characterization tests for refactoring work.

Other judgments need an eval corpus with recorded cases and expected decisions. “The agent said the issue was clear” is no gate.

## Human Approval Is Still a Deliberate Boundary

The PR skill may merge only when three conditions hold:

- I approved the pull request;
- GitHub Actions is green;
- no review thread remains open.

Removing my approval is a policy change, not the final line of an automation ticket. A green test suite proves the properties encoded in that suite. It says nothing about the requirement I forgot to encode or the technically correct feature I no longer want.

{{< admonition type=warning title="Human approval is still a feature" >}}
My approval is not leftover manual work I forgot to automate. It is the current trust boundary, and I will remove it only for work classes with enough evidence and a rollback path.
{{< /admonition >}}

I need trace history and eval results from enough real issues before changing this boundary. I may start by allowing a narrow class of recurring chores to merge automatically: patch dependency updates with a known diff shape, a complete deterministic gate, and a rollback path. Cross-module features can keep the human gate.

Stage 8 does not require every job to have equal autonomy. It requires autonomy to follow encoded policy rather than whoever happens to be watching.

## Recurring Jobs Need Their Own Lanes

The first autonomous coding work should be boring. DazzHub already names good candidates:

- dependency patch updates;
- removal of obsolete PHPStan baseline entries;
- security updates;
- test expansion around measured weak spots;
- routine infrastructure updates with known checks.

These jobs have machine-readable triggers and success criteria. They also expose whether the escalation path works. If a dependency update breaks the suite, the useful result is a Blocked item with the failing test and attempted fixes, not a loop that spends more tokens.

The current Groomer only works on issues that already exist. Nothing creates a chore card from `composer outdated`, a security advisory, or a newly removable baseline entry. A scheduler for chores needs to create the work item, choose the correct lane, and avoid opening duplicates before dispatch even begins.

## Observability Still Has Holes

Langfuse is running, and real Pi traces arrive. The Claude Code integration has one final live-hook verification outstanding. Codex is installed but lacks an authenticated end-to-end trace. The Langfuse worker emits recurring Redis timeout messages whose impact is unknown.

The observer also shares the runner account and rootless Docker daemon with the observed agents. An agent can stop Langfuse. That is acceptable for my current single-user experiment. It is a poor boundary for a service expected to explain a compromised or misbehaving run.

Before I rely on tracing as governance, I need:

- all active agents verified end to end;
- retention and redaction rules;
- backup and restore for the trace store;
- a completed reboot test;
- alerts for missing traces, not only errors inside traces;
- stronger separation between workers and telemetry.

A run with no trace should fail an observability check. Silence cannot count as success.

## The Next Small Step

I am not going to turn on autonomous issue dispatch and automatic merge together. That would combine scheduling, model selection, cost control, retry state, and trust into one failure.

So I am deliberately making the next slice smaller:

1. add the work-item envelope and deterministic phase runner;
2. run one narrow chore lane end to end;
3. schedule it through Orca with a cheap precheck;
4. stop at the existing pull-request approval gate;
5. compare its traces, failures, and cost with interactive runs.

After that works repeatedly, I can decide whether one chore class may merge on its gates. Features can wait.

I can already leave the house and let the backlog groomer run. I am not yet willing to let the whole factory decide what to build, spend, and merge while I sleep. I do not need that to sound impressive. I need enough evidence that it becomes boring.
