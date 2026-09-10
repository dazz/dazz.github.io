---
title: "Coding Agents Don't Scale Teams"
date: 2026-09-10T09:00:00+01:00
tags: [ai, workflow, guardrails, software-development, dim factory, software factory]
image: hero.png
toc: false
---

I'm watching Patrick Debois' talk [*Coding Agents Don't Scale Themselves. Neither Do Your Teams.*](https://www.youtube.com/watch?v=zCJtYuqwm7E) for the third time. He describes a familiar transformation program: hackathons, lunch-and-learns, a shared Slack channel. We know these formats from Agile and DevOps.

And yet a company can run all of them and still depend on a handful of people maintaining private AI workflows.

That gap is what keeps me watching. Underneath it sits one question:

**After the hackathon, what happens to the learning?**

That's what I want to explore with my company and my clients, including colleagues outside engineering. And I want to understand how we bring people into this change without dismissing the working practices they've spent their careers building.

## Sharing a Prompt Is Not Sharing the Practice

The gap isn't limited to development. A colleague may have found a useful workflow for research, customer communication, or documentation. Someone else is still wondering which parts of their work they'd trust a machine with.

Handing over a prompt rarely closes that distance, because its author carries years of judgment that never made it into the instructions. They know which sources to pick, which claims to distrust, and which result needs another pass.

Debois criticizes the idea of educating people and letting "a thousand flowers bloom". He also shows what that looks like in practice: one person publishes a skill, another forks it, and soon nobody knows which version to use or who maintains it. A Slack message helps someone discover a skill. It doesn't tell them whether their copy still contains the current authentication rules.

I'd keep the workshops. What's missing is a **route from an experiment to a supported workflow**.

DevOps didn't succeed through workshops alone either. It needed shared delivery infrastructure. With agents, there's even more to maintain: instructions, context, and the tools through which our standards shape generated work. Explaining a practice and maintaining the components that apply it are different jobs.

## Fix the System, Not the Output

Debois advises developers to improve the system when an agent does something it shouldn't. That's where the technical work on a harness meets the organizational question of what we share.

If I keep reshaping the output until it matches what I wanted, I get a usable result, but I leave the conditions that produced the unwanted behavior untouched. Next run, I do the same work again.

Debois directs that effort toward the context and the harness around the agent. The **context** supplies project knowledge and instructions. The **harness** consists of tools, checks, permissions, and feedback loops. It gives the agent a way to act and to find out whether its actions meet the requirements.

I've been there. In ["When Scripts Turn into a System"]({{< ref "/posts/2026-01-19_scripts-turn-into-system" >}}), I wrote about an agent deleting my database while helping me move a project to Symfony. Afterwards, I added backups and kept telling the agent that migrations were human-only. Those repeated reminders were exhausting.

Looking back through Debois' lens, the real question is where the restriction belongs.

{{< admonition type=tip title="I learned" >}}
A comment communicates my intention. A permission boundary prevents the action.
{{< /admonition >}}

And a restriction that lives only in my setup protects only my work. Built into a maintained execution environment that other teams adopt, it protects them too, without anyone repeating my incident first. That's the multiplier Debois is after: one improvement to a shared system, many people benefiting.

Here's the shift as I read it:

| The Solo Approach | The Shared System Approach |
| --- | --- |
| Personal prompts and workarounds | Shared context with examples and review criteria |
| Repeatedly correcting unwanted output | Improving the workflow that produces it |
| Sharing a successful demo | Maintaining a path another person can follow |
| Looking at one person's speed | Looking at who benefits from a shared improvement |
| Trying to automate more work | Choosing how much to delegate according to risk |

## Five Things I Want to Work On

This is how I plan to build that shared infrastructure with the people who will use it. It's my reading, not a framework from the talk. And it's not a ladder every department has to climb. How much we delegate stays a decision per workflow.

### 1. Start with the people who know the work

Debois describes developers who feel disconnected from their craft when their job turns into prompting and writing specifications. Some find a technical role again by building tools and harnesses for agents.

That applies outside development too. Someone with twenty years of handling difficult customer conversations has good reasons to hesitate before delegating part of it. They know how much depends on context. They may also wonder whether they'll stay responsible for an answer they didn't write.

So start with a task they recognize and look at the output together:

- Where does the output miss something they consider important?
- Which assumptions would they check?
- What would make it usable?

Their doubts are data. They point to missing information, or to a task that shouldn't be delegated at all.

That only works if disagreement is allowed. If the only acceptable conclusion is "the AI workflow works", we lose exactly the experience we asked for. Experienced colleagues should help choose the boundary, not just polish the result.

### 2. Make the judgment shareable

A prompt rarely contains everything its author knows about using it. A shared workflow should also say what it's for, which inputs it needs, and what to check before accepting the output. A worked example teaches more than another paragraph of advice, especially if it includes a bad result and explains why it fails.

{{< admonition type=note title="Example: drafting customer replies" >}}
"Write in the company's tone" leaves the important questions open:

- Which facts may the draft rely on?
- Who can approve a refund?
- When should the colleague drop the draft and involve someone else?

Those boundaries, with examples of how they change a response, *are* the workflow.
{{< /admonition >}}

In engineering, we can encode some of that judgment in tests, linters, and tool permissions. Elsewhere, a source requirement, a review checklist, and an approval step may be the right form. Use whatever helps people do the work. Nobody in finance needs the word "harness".

Debois places a company's "moat" in the knowledge captured in skills, context, and harnesses. For me, that's exactly these domain rules: what makes a result acceptable for *this* business. Maintained, they outlast any particular tool. And making the repeatable parts explicit shows where experienced people still need to be involved.

### 3. Give shared workflows a home

People experimenting bottom-up show what might be useful. They can't settle which data is permitted, which tools are supported, or who is responsible.

Say two developers have built a good AI-assisted code review workflow. To get it off their laptops, someone has to:

- clarify whether the tool may receive client code
- give them time to package it for another team
- agree on who handles updates

{{< admonition type=warning title="The unofficial help desk" >}}
Without that support, the original author ends up answering setup questions, explaining exceptions, and repairing the workflow when something changes, all on top of their actual job.

Sharing an improvement should come with a way to share its maintenance.
{{< /admonition >}}

Debois calls the supported options **paved roads**, maintained by platform or Developer Experience teams. For the review workflow, a paved road can start small:

- a versioned repository with instructions and test cases
- an entry in an internal catalog
- a review process for changes

Another team adopts a known version and contributes back instead of copying a snippet from chat.

But paved roads assume someone to maintain them, and plenty of companies don't have a platform team. In a small company, one team lead might coordinate all of this. The responsibilities need a home. They don't each need a new job title.

And marketing and finance need their own domain knowledge and review boundaries, even when they share tools.

Support also means talking about expectations. If management treats every time-saving experiment as an immediate commitment to higher output, people stop sharing unfinished work and difficulties.

Colleagues should know what we're trying to learn and how we'll discuss changes to their roles. We may not have all the answers yet, but those questions belong in the introduction of a workflow, not after it.

### 4. Learn from real use

Once someone else uses the workflow, you see which parts still depend on knowledge nobody wrote down.

Debois describes retrospectives shifting toward the system: where did the agent get stuck repeatedly, and what can the team improve?

The same question works outside engineering. If colleagues keep correcting outdated product details in AI-drafted customer replies, don't ask them to be more careful. Look at which product information the workflow supplies and how it stays current.

Debois also names a few signals that show whether a workflow is getting easier to use:

- **Human interventions.** Separate a repeated rescue from an approval we intend to keep. Fewer interventions only count if the work is still acceptable.
- **Reach of shared improvements.** Who benefits when the shared system gets better.
- **Cost.** Make it visible and optimize model choice, context, and iteration count. I'd put review effort and rework right next to it: a fast first draft is worth little if verifying it takes longer than doing the task.
- **Downstream load.** Requirements can arrive too slowly, and downstream colleagues can struggle with increased output. Before expanding a workflow, check whether it helps the people receiving its results.

### 5. Delegate according to risk

Near the end, Debois uses the term **dim factory**. It borrows from the dark factory: an automated plant where nobody works on the floor, so the lights can stay off. For software, that means agents taking requirements through implementation, testing, and deployment without human intervention.

Debois dims that ambition. People choose how much autonomy to allow based on the risk of a given task. Some activities run with little involvement; others keep human judgment and approval. In the talk, it's a metaphor, not an operating model.

Donovan Crewe describes the idea in more detail in ["The Dim Factory"](https://www.linkedin.com/pulse/dim-factory-lumenalta-k5rxc/). In his version, agents are components in a controlled pipeline with defined inputs, validation criteria, and enforced constraints. Engineers design those constraints, monitor behavior, and intervene when the system reaches the edge of its capabilities.

I find that a useful picture of the engineering involved: a security rule becomes a pipeline check, a release boundary becomes an approval gate. But those controls address specific risks. They don't make every generated result trustworthy.

For colleagues outside engineering, the practical question is simpler: which parts of this workflow can we delegate, and where does a person stay involved? We don't need to agree on a factory as the destination to answer that.

The consequences differ, so the delegation does too:

| Can run with more autonomy | Keeps a person involved |
| --- | --- |
| An AI draft for internal discussion | A customer commitment |
| An agent working in an isolated environment | A production change |

That requires knowing who or what changed something, whether the result meets our requirements, and what happened when it failed. Debois connects this to auditing, verifiers, and situational awareness.

The people using a workflow need to know where to inspect the work, when to pause, and who resolves a problem. Then we adjust delegation per task, based on experience. Experienced colleagues help decide when the evidence is strong enough to hand over more.

## Improvements Need a Way Back

As a consultant, I help programming teams work with AI together. Debois gives me a way to think about the infrastructure around that work.

Here's the exchange I want to establish:

1. A second team adopts the shared review workflow.
2. They notice it misses an authorization check.
3. They add a test case and improve the review instructions in a pull request.
4. After review, the first team gets that improvement too.

That's what shared skills, versioned project knowledge, and tested harness components are for.

Leadership and platform support give that exchange continuity: ownership, maintenance time, and a place to publish, find, and improve these capabilities. The people experimenting contribute their experience. They don't have to carry adoption across the company alone. And people who join later bring domain knowledge and new cases that improve the shared approach in turn.

After the third viewing, I'm back at the question I started with. The hackathon ends. The learning needs a route to other teams. And a way back.

We still have to decide which capabilities we maintain together and which belong close to a team's domain. But I know how I'll judge the result:

**Not by the original author's demo, but by whether another team can use it and feed an improvement back.**
