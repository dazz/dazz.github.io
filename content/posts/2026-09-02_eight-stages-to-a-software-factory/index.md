---
title: "Eight Stages to a Software Factory, and Where I Am Now"
date: 2026-09-02T17:00:00+02:00
tags: [ai, ai engineering, software factory, agents, orca, workflow, claude code, pi, codex]
draft: true
comments: true
toc: true
---

A few weeks ago, I still started every coding agent myself. I opened a terminal, explained the task, watched it work, ran the tests, and decided what happened next. The agent wrote much of the code, but I remained the scheduler, the state machine, and the audit log.

That setup felt advanced compared with autocomplete. Then I read Upsun's article about [the eight stages of AI engineering maturity](https://upsun.com/blog/8-stages-ai-engineering-maturity/). It gave me an uncomfortable way to describe what I had built: I had several capable workers and no factory.

I started using DazzHub, my Symfony application for discovering and processing technical videos, as the project where I would find out what a software factory needs in practice. Orca became the place where the agents run. The work since then has involved fewer clever prompts than I expected. Most of it has been state, isolation, gates, and deciding which decisions an agent may make.

## The Eight Stages

The maturity model names these stages:

1. **The Vacuum**: developers already use AI, while the organization has made no real decision about it.
2. **The Drift**: individual developers build private prompts, skills, and habits. Their results start to diverge.
3. **The Islands**: whole teams develop different capabilities. One team has shared context and tooling; another does not.
4. **The Standardization Bet**: context files, skills, security rules, approved tools, and training become shared assets.
5. **The Workflow Redesign**: teams change the work itself. Specs become inputs, CI gates agent output, and review focuses on intent and risk.
6. **The Operating System**: agents become part of how the team allocates work. Shared context, tests, budgets, isolation, and coordination become infrastructure.
7. **The Bright Factory**: agents write and ship whole units of work while humans supervise. Much of this still runs interactively on a developer machine.
8. **The Autonomous Factory**: agents run on shared infrastructure, pick up recurring work on schedules, leave central traces, pass automated evals, and escalate failures.

I do not read this as a score. My setup occupies more than one stage at once. DazzHub has repository-owned skills and a formal workflow, which puts parts of it at Stage 6. An agent can take a Ready issue through an isolated worktree, implementation, CI, push, and pull request with little line-by-line authorship from me. That reaches into Stage 7. I still approve merges, and until recently I started every coding run myself.

The useful question became: which missing part still requires my attention?

## My Starting Point Was Already an Island

I had accumulated a good personal setup around Claude Code. DazzHub had an `AGENTS.md`, project commands, architecture rules, and tests. I knew which prompts worked because I had discovered their failure modes one at a time.

That is exactly the Stage 2 trap. The setup worked because I remembered it.

If an agent tried to run a Doctrine migration, I knew why that was dangerous. If it injected a repository into a controller, I knew which project convention it had missed. If two sessions worked in the same checkout, I knew to stop one before they damaged each other's diff. None of that knowledge formed a system until I moved it into repository-owned rules and executable checks.

My first step toward a factory was therefore boring: make the repository explain itself.

DazzHub now carries skills for issue handling, pull requests, fleet operations, backlog grooming, architecture, verification, dependency updates, and naming. A normative workflow document defines which actor may move a card between `Backlog`, `Ready`, `In progress`, `Blocked`, `In review`, and `Done`. When a skill disagrees with that document, the skill is wrong.

This distinction matters because prompts are suggestions to a model. A state transition is a rule I need on every run.

## Orca Gave the Agents a Place to Work

The maturity model describes Stage 7 agents running from terminals on laptops. I wanted to remove my laptop from the execution path early, so I installed Orca on a dedicated Ubuntu VM called `dazztronic-box`.

I chose Ubuntu even though my desktop runs NixOS. Orca ships Linux builds as an Electron AppImage and updates often. More important, agents install tools at runtime: npm packages with native builds, Python tools, downloaded binaries. I am willing to debug Nix store paths on my own desktop. I do not want an unattended run to fail overnight because a downloaded binary expects an FHS system.

The VM has two users with real roles:

- `dazz` operates the machine and has sudo.
- `dazztronic` runs Orca, the coding agents, rootless Docker, repositories, and a restricted GitHub identity.

Orca runs Claude Code, Pi, and Codex as children of the runner. Giving Orca a third Unix user would only duplicate credentials while requiring the same repository access. The useful boundary is the runner account. Anything that account can do, an agent may eventually do too.

With Orca, I found several pieces that map directly onto the factory problem.

### Remote runtime

`orca serve` keeps the runtime on the VM. I can connect from my NixOS desktop or my phone, while the repositories, credentials, containers, and sessions stay on the server. Closing my laptop no longer kills the place where the work happens.

### Worktrees as first-class workspaces

Orca can create a worktree and open it as a tracked workspace. Each issue gets its own branch, checkout, terminal, and agent session. DazzHub's factory CLI now prefers `orca worktree create` when the Orca runtime is reachable and falls back to `git worktree add` when it is not.

That sounds like convenience until two agents edit the same checkout. Isolation is a prerequisite for parallel work, not a UI feature.

### Several agents in one runtime

Claude Code, Pi, and Codex can live on the same box. I do not need to pretend they are interchangeable. Claude currently does most execution, Pi has been useful as an independent reviewer, and Codex is present but still lacks a fully verified login and tracing path. The runtime lets me assign different jobs without moving the repository or copying context between machines.

### Orchestration

Orca sessions can start workers in child worktrees and keep the coordinator separate from the implementation context. This is close to the shape I want: one session reasons about the queue and delegates bounded units of work; worker sessions operate in isolated checkouts.

The important discovery was that orchestration alone does not create governance. A coordinator can start five workers just as easily as one. DazzHub still needs the board claim, WIP rules, verification gate, and merge policy around it.

### Scheduled automations with prechecks

Orca automations supplied the first unattended actor in the workflow. An hourly backlog groomer checks whether the board has capacity before it starts a model session. A full board exits at the precheck, records a skipped run, and spends no tokens.

When there is capacity, the groomer reads `Backlog`, verifies one issue against the code, and either promotes a complete spec to `Ready`, asks one concrete question, or marks a thin issue for refinement. It never writes code and never touches a card outside `Backlog`.

That narrow permission was my first practical lesson in autonomy. The useful unit is not “an autonomous agent.” It is an actor allowed to make one kind of decision under checkable conditions.

## The First Factory Pieces

The repository now contains a small Deno CLI under `factory/`. It grew from repeated shell fragments in Markdown that had no tests. The CLI handles board reads and writes, journal entries, and worktree lifecycle. Its exit codes are contracts because both skills and Orca prechecks branch on them.

The issue flow looks like this:

1. A complete card reaches `Ready`.
2. An agent claims it before analysis, so another run cannot take the same work.
3. The factory creates an isolated worktree.
4. The agent changes only the requested scope.
5. The full local gate runs: PHPUnit, PHPStan, CS Fixer, and Deptrac.
6. A focused architecture review checks what those tools cannot see.
7. A green run pushes a feature branch and opens a pull request.
8. GitHub Actions runs the same gate again.
9. I review and approve before the agent may merge.

Failures also have a path. A red gate gets up to three bounded attempts with wider context. After that, the card moves to `Blocked`, gets a reason label, returns to me, and keeps its worktree for inspection. An environmental failure can resume only after the run repeats the exact check named in the block comment.

I used to treat a failed agent session as a conversation that went badly. Now it becomes state another session can inspect.

## Where This Leaves Me

DazzHub sits around Stage 6 with working parts of Stage 7. Agents can deliver complete issues, and Orca already supplies shared runtime, worktree isolation, coordination, remote access, and scheduled automations. The backlog can refill itself under a WIP cap.

The queue still does not drain itself. A human starts the coding run on a `Ready` card. I still approve every merge. The workflow records failure states, but it does not yet have the immutable envelope that should carry attempts, touched paths, gate results, and rejection history through every phase.

Those gaps are useful. They tell me where to work next without pretending that “more autonomy” is one feature.

The next post in this series follows the less tidy part: using the setup on real DazzHub issues, finding where the Markdown rules drifted, and turning repeated mistakes into a tested factory CLI.
