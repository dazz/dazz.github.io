---
title: "The Factory Looked Good Until It Had to Work"
date: 2026-09-07T17:00:00+02:00
tags: [ai, ai engineering, software factory, agents, orca, workflow, deno, testing, dazzhub]
image: hero.png
draft: true
comments: true
toc: true
---

{{< admonition type=tldr title="TL;DR" >}}
My workflow looked good until real DazzHub issues put pressure on it. Commands tested the wrong checkout, copied shell snippets drifted apart, and the journal executed text that should have been data. The fix was not a longer prompt. I moved repeated operations into a tested [Deno](https://deno.com/) CLI with [cliffy](https://cliffy.io/) and turned important rules into executable checks.
{{< /admonition >}}

The first version of my agent workflow looked convincing in Markdown. It had a board, named states, skills for each job, worktrees, a CI command, and rules about when an agent had to stop.

Then I used it on DazzHub every day.

The failures did not arrive as dramatic model hallucinations. They arrived as a Docker command testing the wrong checkout, three skills carrying slightly different copies of the same shell, and a journal message executing the backticks it was supposed to record. The agents were productive enough to put pressure on every weak part of the setup.

And honestly, that pressure has been the most useful part of building the factory. The awkward failures showed me where the workflow was only convincing on paper.

## The Project Underneath the Experiment

DazzHub is a Symfony application that discovers technical videos, scores them, fetches transcripts, and turns them into searchable knowledge and Markdown posts. It has PostgreSQL with pgvector, Neo4j, asynchronous workers, external AI services, and a growing set of domain modules.

It also has history. The test suite and architecture rules are strong in some areas and still being improved in others. That makes it a better factory test than a greenfield demo. An agent must work with existing conventions, baselines, data, containers, and GitHub workflow state.

I started with repository skills that described the full issue lifecycle:

- select a `Ready` issue from the board;
- claim it;
- create an isolated worktree;
- implement the issue;
- run the complete gate;
- push a feature branch;
- open a pull request;
- wait for human approval;
- merge and clean up.

The happy path worked. The repeated runs showed me where the real state still lived in my head.

## A Green Gate Against the Wrong Branch

One of the nastiest findings came while working on PHPStan rules. The DazzHub application runs in Docker, and the existing development container had a bind mount from another worktree. I ran the expected command through `docker compose exec app` and got results from that foreign checkout.

The command succeeded. That made it worse.

A failing command tells me to investigate. A green command against the wrong source tree tells me a lie. In this case, a baseline regeneration even wrote into the other worktree.

{{< admonition type=danger title="Green against the wrong code" >}}
A successful check is worthless when it runs against another checkout. This failure changed my idea of a gate: it must verify its execution context, not only its exit code.
{{< /admonition >}}

The agent workflow already required isolated Git worktrees. It had not isolated the running Compose stack. The journal entry from that day now records the diagnostic command I needed:

```shell
docker inspect dazzhub-app --format '{{range .Mounts}}{{.Source}}{{end}}'
```

That incident changed how I evaluate guardrails. A rule that says “run CI in the worktree” is weak if the command can silently cross the boundary. The factory needs a command whose implementation knows how this project runs, not another paragraph reminding the agent to be careful.

## The Compose Project Name Reversed Three Times

My first response was to put a fixed Compose project name into `docker-compose.yml`. That would make bare `docker compose` commands target the existing stack consistently.

Then I noticed the consequence for worktrees. A tracked project name applies in every checkout. A command from an issue worktree could reach the main checkout's shared stack and test the main code. I had replaced “command finds nothing” with “command succeeds against the wrong thing.”

I tried a Makefile variable and a main-checkout guard. It worked, but the setup became harder to understand than the problem deserved.

The final decision used an existing property: `.env` is git-ignored. It exists in the main checkout and does not appear in new worktrees. The main checkout gets the intended Compose project name; a bare command in a worktree resolves to a harmless empty project. The explicit CI target still names what it needs.

This decision changed three times in a weekend. I kept all three in the project journal because the final diff cannot explain why the obvious tracked setting is absent.

That is one reason I added an append-only journal. Git records what survived. It does not record the viable option I rejected after discovering a failure mode.

## The Journal Then Executed Its Own Message

The journal started as a Make target:

```shell
make log KIND=finding MSG='...'
```

The Makefile interpolated `MSG` into a shell recipe. I wrote an entry about the Compose problem using backticks around a command. The shell performed command substitution and ran the command while writing the note. The resulting journal line contained several kilobytes of command output.

A tool intended to preserve a failure had reproduced its failure class.

{{< admonition type=bug title="The journal executed the journal entry" >}}
Backticks inside the message became shell command substitution. It is funny now. It was less funny when several kilobytes of command output landed in the journal.
{{< /admonition >}}

The fix was small: export the message through the environment and read it as data. I also added a length cap. The larger lesson was that I had management logic embedded in Make recipes and Markdown snippets with nowhere to test it.

By the end of that week, the project had enough examples to justify a small management CLI.

## From Shell Fragments to `factory/bin/dazzhub`

I first planned to write the CLI in PHP. DazzHub is a PHP project, Symfony Console was already familiar, and the quality toolchain existed.

The host running the agents had no PHP interpreter. Each fresh worktree would also need Composer dependencies before the management tool could create or prepare it. The tool responsible for bootstrapping a worktree would depend on a bootstrapped worktree.

I switched to Deno and TypeScript. Deno gives the CLI one host binary, a committed lock file, no `node_modules`, and explicit runtime permissions. The supported entry point is now:

```shell
factory/bin/dazzhub
```

The CLI owns operations that are management, repeated, multi-step, and worth testing:

- append a structured journal entry;
- read and update the GitHub Projects board;
- calculate WIP capacity for an Orca precheck;
- report stale Blocked cards;
- create, remove, and sweep issue worktrees.

One-liners remain one-liners. The Symfony application remains in `app/`. I did not build a framework around the framework.

The permissionless unit suite became one of my favorite checks. A plain `deno test` runs with no read, write, network, or subprocess permission. The tests for adapters assert that the runtime refuses those operations. Separate narrow passes test the filesystem boundary, architecture walk, and repository skills.

The permissions do not make child processes safe. Allowing `gh` still starts an unrestricted `gh` process. They do catch an accidental `Deno.Command("sh", ...)`, and they force every external program to have a name I can inspect.

{{< admonition type=tip title="I learned" >}}
When a rule can become an exit code, parser, or test, I move it out of the prompt. The model should spend its judgment on things I cannot check deterministically.
{{< /admonition >}}

## One Board Command Instead of Several Copies

The first skills each carried their own GitHub Projects GraphQL and `jq` fragments. They started close enough to look shared. Then one expected a project item ID where another used an issue number. Column names were matched differently. Read limits drifted. A later change had to update several fenced code blocks and several grep-based checks.

The factory CLI now provides one read shape and one write path:

```shell
factory/bin/dazzhub board show ready
factory/bin/dazzhub board set status 203 progress
factory/bin/dazzhub board set tier 203 standard
```

The skills still decide when a transition is allowed. The CLI resolves fields, options, and item IDs and performs the write. That boundary matters. I do not want the CLI making product decisions, and I do not want three agents reimplementing GitHub's project schema in prompts.

I replaced the old grep guards with Deno tests that parse the skills. During that work I found another quiet bug: the shell script that extracted fenced commands only recognized fences starting at column zero. Code blocks nested under a list item were invisible to every guard. The checks had been green because they skipped part of the material.

The replacement tests accept indented fences and assert workflow properties over the actual command snippets. The comments explaining retired checks were then deleted. Once a property is a test, I do not need prose claiming the same thing.

## Orca Changed the Worktree Lifecycle

A plain Git worktree isolates files, but Orca only knows about worktrees it creates or tracks. A factory-created checkout without an Orca pane is operationally invisible from the runtime where the agents work.

The DazzHub CLI now probes `orca status --json`. If the runtime answers, it creates the worktree through Orca and reads the path from Orca's JSON response. If Orca is unavailable, it falls back to `git worktree add` and says which Orca command would have been better.

That path needed two review rounds. The first implementation used `orca --version` as its probe, which proves only that a binary can print help. It does not prove a runtime is reachable. It also fabricated the expected worktree path instead of reading Orca's response. Pi caught both in review.

A later real run found that Orca nests the path under `result.worktree.path`, while my parser expected a top-level `path`. Orca had created the worktree successfully, and my wrapper exited with an error because it could not read the result. That bug is now in the journal and has its own issue.

This is what refining the setup looks like. The integration is useful before it is complete, and every mistaken assumption becomes a smaller contract.

## Skills Became Roles With Limited Authority

The issue skill originally carried most of the workflow. As the board became busier, I separated roles:

- the **Groomer** decides which Backlog card may become Ready;
- the **executing agent** claims one Ready card and produces a pull request;
- the **PR skill** handles review remarks and merges only after approval;
- the **fleet skill** owns worktrees and verification;
- the deterministic CLI performs board and worktree mechanics.

The Groomer is the first scheduled actor. Orca runs it hourly with a precheck. It may promote one fully specified, unassigned card when fewer than three cards are in `Ready + In progress + In review`. It may ask one question. It writes no code and cannot touch an in-flight card.

This narrow role solved a problem I had created with too much automation. I wanted `Ready` to refill without turning the entire board over to a model. The answer was a small decision surface with a WIP cap and a cheap precheck.

## What the Real Work Changed

The project started with prompts telling agents how I work. It now has a state machine, a tested management CLI, an append-only decision journal, worktree lifecycle, board capacity, and an unattended backlog actor.

More important, I have a criterion for moving another rule out of prose: if the rule can be expressed as an exit code, parser, database constraint, or test, it should stop depending on a model remembering it.

Some rules remain in skills because they require judgment. Is this issue fully specified? Does this architecture finding exceed the ticket? Which Backlog card collides least with current work? I keep those decisions narrow and preserve the evidence in issue comments.

The setup is still being refined while it works. I prefer that to designing a perfect factory in isolation. DazzHub keeps producing the awkward cases I need: stale assumptions, concurrent branches, environment failures, review corrections, and commands that succeed for the wrong reason.

The next part of the series covers the thing I needed before allowing more unattended work: one place to see what Claude Code and Pi actually did.
