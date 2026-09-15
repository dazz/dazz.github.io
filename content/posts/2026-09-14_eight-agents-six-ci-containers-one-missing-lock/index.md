---
title: "How I DDoSed My Own Agent Server with One Prompt"
date: 2026-09-14T08:00:00+02:00
tags: [ai, ai engineering, coding agents, orca, claude code, concurrency, ci, guardrails, dazzhub]
draft: true
comments: true
toc: true
---

I gave Claude Opus a short instruction: "take care of all open pull requests".

By the time I intervened, eight agents were trying to bring eight pull requests through rebase, CI, review, and merge. Six CI containers were running at once. The host load had reached 66.70, and swap usage sat at 3.6 of 4 GiB. Orca still showed me terminals, but the system had become too slow to operate through them.

The prompt did not ask for eight workers. It also did not say that the pull requests should run in parallel. Opus saw several independent tasks and used the capacity I had given it. Each worker then followed the same repository rules:

1. fetch the current `main` branch;
2. rebase its pull request;
3. resolve conflicts;
4. run the isolated CI gate;
5. push the rebased branch;
6. wait for GitHub Actions and merge after approval.

That workflow works for one pull request. Eight copies formed a feedback loop.

{{< admonition type=tldr title="TL;DR" >}}
Each agent followed a sensible merge workflow. Their rebases and CI runs invalidated one another until they occupied the host. I stopped the fleet and added a kernel-backed integration lock that lets one pull request own the path from selection through merge.
{{< /admonition >}}

## How correct workers made the host unusable

The first worker rebased and started CI. The other seven did the same in their own worktrees. When one pull request merged, `main` moved forward. Every remaining rebase now targeted an old commit.

The workers noticed. Their instructions told them to integrate against the current head, so they fetched, rebased again, and restarted their gates. The next merge moved `main` again.

```mermaid
PR A merges
  -> main changes
  -> PR B-H rebase again
  -> PR B-H run CI again

PR B merges
  -> main changes
  -> PR C-H rebase again
  -> PR C-H run CI again
```

Git worktrees protected the checkouts from one another. They did not protect the shared integration target. They also shared the same CPU, memory, Docker daemon, and PostgreSQL service.

The force pushes were individually careful. The CI gates checked useful things. Rebasing onto the latest `main` was the correct precondition for merging. The failure appeared when the orchestrator multiplied those actions without a global owner for integration.

I had built a parallel implementation system and let it behave like a parallel merge queue.

This was also a gap in my reactor. It could react to a green, mergeable pull request and to human review activity. An approved pull request with conflicts was invisible because selection required GitHub to report `MERGEABLE`. Several pull requests therefore waited for manual intervention. My broad prompt handed all of them to Opus at once.

The rules supplied persistence. An agent did not stop after one stale rebase because its goal remained unfinished. That persistence usually helps. Here, it kept feeding work into a host that had already run out of room.

## Stopping without destroying the evidence

I did not want recovery to create a second incident. Several worktrees contained rebased commits that had not been pushed. Killing every terminal and deleting every container would have made the machine responsive while throwing away the state I needed to understand.

I stopped the queue runner before it dispatched another worker. I disabled the Groomer, Walker, and Reactor schedules. I sent the active PR workers a narrow instruction: stop scheduling new operations, preserve the worktree, report the state, and wait.

I paused the six exact CI containers instead of unpausing or deleting the batch blindly. I recorded their IDs and log tails in a recovery manifest. The Opus coordinator stopped its own queue monitor. No rebase was aborted, and no worktree was reset.

The load fell from 66.70 to 1.71.

That number gave me a responsive machine again. It did not repair the missing control. A written recovery rule now said “one PR at a time,” but another prompt could still create the same shape of work.

## The lock has to start before selection

My first instinct was to put a concurrency instruction into the orchestrator prompt. The incident had already shown the limit of that approach. Prompt text can guide an agent's choice. It cannot arbitrate between a scheduled reactor, a manual command, and another orchestrator session that all start independently.

They need one shared primitive outside the model.

Claude Opus reviewed the proposed fix and wrote: “`flock` is the right primitive here.” All integration entry points run on one host under one Unix user. A kernel-backed file lock gives them a common boundary without adding a coordinator service or a lock database.

The lock lives at:

```text
$HOME/.local/state/dazzhub/pr-integration.lock
```

The important part is when the runner acquires it. The Reactor must take the lock before it selects a pull request. If selection happens first, two reactors can reserve work and only discover the collision after both agents exist.

The slot now covers the whole foreground integration session:

```text
acquire slot
  -> select one pull request
  -> start its agent in the existing worktree
  -> rebase if needed
  -> run the gate
  -> push
  -> wait for checks
  -> re-read approval and review threads
  -> merge or stop with a recorded outcome
release slot
```

A competing launch exits with precondition code 3 before planning or starting an agent. It prints the recorded holder, including the process ID, start time, worktree, command, and foreground agent PID. I can now see who owns the slot instead of guessing from terminal age or CPU usage.

On Linux, the kernel releases the advisory lock when the owning process closes the file descriptor or dies. The implementation also checks the recorded foreground agent PID. That covers a parent process dying while its child agent remains alive. The next runner reports the existing agent instead of starting a second writer in the same integration lane.

## The first lock implementation needed its own review

The first version used a shell wrapper around `flock`. It worked in the contention test and carried two operational mistakes.

The wrapper set `umask 077` to protect the lock file, then used `exec` to start the agent. A process inherits its umask. Every file the agent created afterwards received mode `0600`, and every directory received `0700`. The rootless CI container can run under a different mapped user, so a permission meant for one state file could make the worktree unreadable to the gate.

The wrapper also created an empty lock file. A blocked launch could report that somebody held the slot, but it could not name the owner. My workflow forbids stealing a lock based on age and forbids killing an idle-looking agent. An empty file left recovery with no safe next action.

Claude found both issues during review. We first restored the caller's umask after opening the protected file and wrote holder metadata while retaining the same inode. Then we removed the shell runners altogether and moved the operation into the existing TypeScript factory CLI.

The final entry points are:

```bash
factory/bin/dazzhub reactor run
factory/bin/dazzhub integration run -- <foreground-agent> ...
```

The Factory owns lock acquisition, holder updates, foreground process lifetime, signal forwarding, and release. Tests cover contention, failure release, a surviving child after an owner crash, stale PID metadata, and cleanup of the recorded agent PID. The architecture test still permits only the existing process-runner adapter to spawn processes.

This review mattered as much as the choice of `flock`. The primitive was suitable from the start. The wrapper around it changed permissions across a much larger scope than intended.

## Serial recovery before automatic recovery

With the schedules still disabled, I applied the new policy manually to the approved queue. I processed pull requests #313, #317, and #318 in order.

For each one, I preserved any local rebase, fetched the new `main`, ran the relevant gate, pushed with a lease pinned to the previously observed remote commit, and waited for checks on the new head. I re-read the approval and unresolved review threads immediately before merge. Only after one pull request had merged did I start the next.

The PHP-changing pull request ran 779 PHPUnit tests with 2,075 assertions, PHPStan, Deptrac, and the style gate in one isolated CI container. The documentation and Factory changes used their relevant checks without consuming a PostgreSQL-backed PHP gate. All three merged without restarting the loop.

That recovery validates the sequence I want. It does not validate the automatic lock path because the lock change is still in pull request #327 as I write this. Its Factory suite and GitHub checks are green, the review findings are resolved, and Claude has reviewed the final rebased implementation without another finding. My human approval remains required before merge.

## What the lock does not solve

The integration slot is local to one host and one Unix user. A second machine would need a shared coordination mechanism. A command that bypasses the Factory entry point can also bypass the lock, so every supported pull-request integration path now calls the same command.

The lock serializes pull-request integration. It does not impose a host-wide budget on implementation workers or other expensive jobs. Issue #326 remains open for that separate CI limit. The six paused containers also remain recovery artifacts; their incomplete runs cannot count as green gates.

I am keeping the scheduled automations disabled until the integration change is merged and I have a controlled restart plan. I will enable one lane, trigger contention on purpose, and confirm that the losing invocation exits before it selects work. Then I can watch one real pull request keep the slot through GitHub Actions and release it after merge.

One prompt exposed a concurrency policy I had left implicit. The agents followed their local instructions and consumed every resource I had made available. The repair gives the host one place where it can say: this pull request owns integration; the others wait.
