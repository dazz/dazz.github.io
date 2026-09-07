---
title: "The Bright Factory Needed Windows"
date: 2026-09-10T17:00:00+02:00
tags: [ai, ai engineering, observability, langfuse, agents, orca, claude code, pi, codex, self-hosting]
draft: true
comments: true
toc: true
---

Claude Code, Pi, and Codex all kept session logs on my agent server. In theory, I could audit every run. In practice, that meant connecting to the machine, finding three different directories, and reading three different JSONL formats.

I had logs in the same way a box of receipts is accounting.

This became a problem when DazzHub reached parts of Stage 7, the “Bright Factory” in Upsun's [AI engineering maturity model](https://upsun.com/blog/8-stages-ai-engineering-maturity/). Agents could take whole issues through implementation and pull requests. Orca could keep several sessions and worktrees running on the shared VM. I could see terminals, but I could not answer simple questions across the fleet:

- Which agent worked on this issue?
- Which tools did it call before it changed the file?
- How much did a run cost?
- Where did retries happen?
- Did a hook fail, or did the model never produce the expected event?

Stage 7 can look productive while still depending on a human watching the terminals. I wanted a central record before giving the agents more unattended work.

## Why I Chose Langfuse

All three agents already produce local session data. I did not want to replace their harnesses or route every model call through a new application. Langfuse has integrations that observe the existing sessions:

- the Claude Code integration processes transcript data from `Stop` and `SessionEnd` hooks;
- a Pi extension listens to Pi lifecycle events;
- the Codex plugin processes its session rollout through a `Stop` hook.

Each integration can turn model generations and tool calls into traces grouped by session. That gave me one backend without forcing the three agents to behave as one agent.

I chose to self-host it on `dazztronic-box`. The point of moving the runtime off my laptop was to create shared infrastructure I control. Sending the audit trail to another service by default would have undermined part of that experiment.

Self-hosting Langfuse is not one container. My Compose stack contains:

- Langfuse web;
- Langfuse worker;
- PostgreSQL;
- ClickHouse;
- Redis;
- MinIO.

That is a substantial observer for one VM with 14 GiB of RAM. Before starting it, the box had 10 GiB available and 31 GiB free on disk. During first-boot migrations, memory use reached 8.5 GiB and swap grew by about 0.2 GiB. After fifteen minutes it settled at 5.8 GiB used with 8.9 GiB available. The images and volumes consumed around 5 GiB of disk.

Those numbers made the decision real. “Add observability” had a resource budget.

## Keeping the Observer Separate

DazzHub already had a Compose stack. Sharing its PostgreSQL would have saved one container, but it would also couple the application and its observer. I wanted to tear down or upgrade Langfuse without touching the project it watches.

I gave Langfuse its own Compose project, own database, and own volumes. Every published port binds to `127.0.0.1`. The web interface does not become reachable on the LAN because upstream's Compose file happened to publish port 3000.

I also vendored the upstream Compose file and pinned every image. MinIO made that more awkward than expected. The current Chainguard image only publishes `latest`, so I pinned its digest instead of pretending that a floating tag is a version.

The first boot took about five minutes. ClickHouse migrations ran before the web process answered requests. The socket accepted connections while HTTP calls hung, which looked broken if I checked too early. A second `docker compose up` was unnecessary; waiting was the fix.

I did not accept “all containers are Up” as verification. I sent one OTLP trace to the real ingestion endpoint and queried ClickHouse to confirm that one row arrived.

That check found the first protocol surprise. Langfuse v4 rejects the old `trace-create` event shape at `/api/public/ingestion` with HTTP 207. Trace and span ingestion moved to OTLP. The response looked enough like an authentication problem to waste time, but a bad key returned 401. The credential worked; the event type was obsolete.

## Claude Code: The Silent Hook

Langfuse provides an official Claude Code marketplace plugin. Installation was simple, and the plugin listed its `Stop` and `SessionEnd` hooks. A fresh agent session produced no trace.

It also produced no plugin log and no visible error.

The plugin stores configuration for Claude Code to inject through the operating-system keychain. On this server, Orca launches agent processes with:

```text
DBUS_SESSION_BUS_ADDRESS=disabled:
```

The GNOME keyring was running, but the agent process could not reach the Secret Service over D-Bus. The hook started without its Langfuse keys and failed open before writing a log. Failing open is sensible for a telemetry hook because tracing must not block coding. It also made the cause invisible.

I moved the three Langfuse variables into a mode-600 environment file sourced by the runner's shell. Plain environment variables do not need D-Bus. A manual replay of a real transcript from a shell shaped like an Orca agent session processed three turns and increased the ClickHouse row count.

One qualification remains in my notes: I verified the hook script with the real transcript and real shell environment, but I have not yet recorded a fully automatic live `Stop` event after that fix. The difference is small in commands and important in evidence.

## Pi: The Integration That Needed an Old Protocol

Langfuse does not publish an official Pi extension. I found a community package, then read it before installing it. I checked its dependencies, network calls, file access, CI, and whether the npm package matched the repository. Pi extensions run inside the agent and deserve the same suspicion as any other code with session access.

The extension installed cleanly and immediately hit the Langfuse v4 protocol boundary. It depends on a v3 Langfuse SDK and still sends `trace-create`, `span-create`, and related events to the legacy ingestion endpoint. The v4 server rejected them.

Langfuse provides a migration mode that accepts both protocols. I enabled:

```text
LANGFUSE_MIGRATION_V4_WRITE_MODE=dual
```

After recreating the web and worker containers, a real `pi --print` turn completed and the trace count went from zero to one in ClickHouse. This is the strongest of my three agent integrations because I verified it from actual model turn to stored trace.

The bridge stays until the Pi integration moves to a v4-native SDK. It is compatibility debt with a named removal condition.

## Codex: Installed Is Not Verified

The official Codex observability plugin is installed, and hook support is enabled in `~/.codex/config.toml`. The command-line flag that appeared to enable hooks only applied to that one invocation, so I had to persist the feature setting myself.

The integration still lacks an end-to-end result. Codex requires a one-time interactive trust review before it runs the hook. The server also has no working Codex authentication yet, so a test model call fails with 401 before a completed turn can emit a `Stop` event.

I could call the installation “wired” and move on. The useful status is more precise:

- plugin installed;
- configuration present;
- hook not trusted yet;
- no authenticated real turn;
- no trace verified.

Observability work has made me much less tolerant of verbs such as “configured” and “working.” They describe different checkpoints.

## The Incident Inside the Observability Work

While diagnosing the shared environment, I printed the real Langfuse public and secret keys into an agent session transcript.

The instance only listens on localhost, and the transcript is visible to an operator who already controls the machine. The immediate impact was low. The irony was excellent: while building a central record of agent activity, I created the exact secret-bearing record I wanted to avoid.

I wrote the incident into the machine changelog instead of quietly deleting the evidence. The current setup avoids printing secret values during normal checks. A verification command checks only that the variable lengths are non-zero.

Tracing increases the amount of sensitive context collected. Tool arguments, prompts, file paths, and accidental output now have a longer life and a nicer search interface. Central logging improves auditability and increases the value of the thing an attacker would want. Retention, access, and redaction need to become explicit before this grows beyond my own server.

## What I Can See, and What I Still Cannot

The Langfuse stack runs locally and has accepted real traces. Pi is verified end to end. Claude Code's transcript replay works with the environment fix, while the automatic hook path still needs one final proof. Codex remains installed but unverified.

The stack also has an unresolved warning. The Langfuse worker logs recurring Redis socket timeouts even though Redis answers `PING` and real ingestion succeeds. I left it open rather than converting “did not break my test” into “harmless.” Real multi-agent traffic will show whether it drops jobs or only reports noisy blocking reads.

There is another structural weakness: Langfuse runs under the same `dazztronic` user and rootless Docker daemon as the agents it observes. An agent can stop its own observer. I accept that for this phase, and I wrote it down so it remains a decision.

Central traces do not make the factory autonomous. They give me evidence to decide which job can run unattended, where it fails, and whether its gate catches the failures I care about.

That is the window I needed in the bright factory. The last post in this series looks at the controls still missing before I am willing to call it Stage 8.
