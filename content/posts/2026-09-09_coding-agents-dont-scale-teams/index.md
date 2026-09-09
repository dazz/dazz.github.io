---
title: "From Individual AI Workflows to Shared Company Practice"
date: 2026-09-09T16:10:32+02:00
tags: [ai, ai engineering, coding agents, developer experience, organisational learning, teams]
draft: true
toc: true
---

I am watching Patrick Debois’ [“Coding Agents Don't Scale Themselves. Neither Do Your Teams.”](https://youtu.be/zCJtYuqwm7E) for the third time. I keep coming back to the distance between someone finding a useful way to work with AI and a company learning how to use it together.

That distance exists beyond development. A colleague may have found a useful workflow for research, customer communication, or documentation. Someone else may still be wondering which parts of their work they would trust a machine to do. Sharing a prompt does not necessarily help them cross that gap. The person using it may carry years of judgment that never made it into the instructions.

As a senior developer and consultant that helps teams in their projects, I want to understand how we make that experience available to others. I also want to understand how we bring people into this change without dismissing the working practices they have spent much of their careers developing.

Debois speaks about coding agents and engineering organisations. He describes difficulties that go beyond choosing a model, then offers ways to work through them. I find that useful when so much of the conversation stops at how hard AI adoption is. His proposals give me a starting point for thinking about my company and my clients, including colleagues outside engineering.

## After the hackathon, what happens to the learning?

Debois names a familiar rollout: a hackathon, a lunch-and-learn, a shared Slack channel, a champions programme. He calls these generic transformation activities. We could use the same formats to introduce Agile or DevOps.

I would keep opportunities to learn together. A workshop gives people time to experiment. A chat gives them somewhere to ask for help. But I can see why those activities alone leave a gap. After someone demonstrates a useful workflow, who helps another person use it? Who updates it when the tool changes? Where do the lessons from an unsuccessful attempt go?

A colleague can share their prompt and still spend the next week explaining everything around it. They know which source material to select, which claims to distrust, and which result needs another pass. The person trying the prompt for the first time does not necessarily have that knowledge.

Debois proposes giving team leads and platform people a mandate to develop shared context, harnesses, and maintained working paths. I read that as a way for leadership to meet the people already experimenting. Their experience provides somewhere to start. Company support can help turn it into something others can use without relying on the original author for each attempt.

## The shift: improve how the result gets produced

The part of the talk I keep returning to is Debois’ advice to improve the system when an agent does something it should not.

If I keep reshaping the output until it matches what I wanted, I may get a usable result. I have left the conditions that produced the unwanted behaviour unchanged. On the next run, I can end up doing the same work again.

Debois directs that effort towards the context and harness around the agent. By harness, I mean the tools, checks, permissions, and feedback loops that guide its work. The context supplies project knowledge and instructions; the harness gives the agent a way to act and to find out whether its actions meet the requirements.

That connects with my own experience. In [“When Scripts Turn into a System”]({{< ref "/posts/2026-01-19_scripts-turn-into-system" >}}), I wrote about an agent deleting my database while helping me move a project to Symfony. Afterwards, I added backups and kept telling the agent that migrations were human-only. I also wrote about how exhausting those repeated reminders became.

Looking back at that experience through Debois’ argument, the question becomes where the restriction belongs. A comment communicates my intention. A permission boundary can prevent the action. Those give me different kinds of protection, even if both begin with the same lesson about what the agent should be allowed to do.

For a team, the benefit extends beyond my next session. If we use the same improved workflow, a colleague can benefit from the correction without first repeating my experience.

I see the broader shift in the talk like this:

| Where we often begin | What we can develop together |
|---|---|
| Personal prompts and workarounds | Shared context with examples and review criteria |
| Repeatedly correcting unwanted output | Improving the workflow that produces it |
| Sharing a successful demonstration | Maintaining a path another person can follow |
| Looking at one person's speed | Looking at who benefits from a shared improvement |
| Trying to automate more work | Choosing how much to delegate according to risk |

Debois expects the underlying agent technology to become more widely available, perhaps as a service from frontier labs. That is his starting assumption. Whether or not it happens on the timeline anyone expects, I still see value in helping colleagues preserve and reuse what they learn.

## Five steps towards a shared AI practice

The five steps below are my way of applying Debois’ ideas, including beyond engineering. They are not a numbered framework he presents in the talk. I would treat them as a gradual way to learn, rather than stages every department has to complete. How much work we eventually delegate remains a decision for each workflow.

### 1. Start with the people who know the work

Debois describes developers who feel disconnected from their craft when their role becomes prompting and writing specifications. Some find a technical role again when they start building tools and harnesses for agents. Their expertise helps shape how the agent works.

I think this matters outside development too. Someone who has spent twenty years learning how to handle a difficult customer conversation may have good reasons to hesitate before delegating part of it. They know how much depends on context. They may also wonder whether they will remain responsible for an answer they did not write.

I would begin with a task they recognise and examine the output together. Where does it miss something they consider important? Which assumptions would they check? What would make it suitable to use?

Debois suggests involving sceptical developers in better context and harnesses. My broader interpretation is to give experienced colleagues a role in deciding what good work looks like and how we verify it. Their doubts can reveal missing information or a task that is unsuitable for delegation.

That participation needs room for disagreement. If the only acceptable conclusion is that the AI workflow works, we lose the value of asking someone with experience to examine it. I would want them to help choose the boundary as well as improve the result.

### 2. Make the judgment shareable

A prompt rarely contains everything its author knows about using it. I would try to make more of that judgment explicit alongside the instructions.

For a shared workflow, I want to understand its intended use, the inputs it needs, and what someone should check before accepting the output. A worked example can show more than another paragraph of general advice, especially if it includes an unsuitable result and explains why it fails.

Consider a hypothetical workflow for drafting customer replies. Sharing the instruction to write in the company’s tone would leave much unresolved. Which facts may the draft rely on? Who can approve a refund? When should the colleague stop using the draft and involve somebody else? A useful shared workflow would include those boundaries and examples of how they affect a response.

In engineering, we can express some of that judgment through tests, linters, and tool permissions. In another department, we might start with source requirements, a review checklist, and an approval step. I would use the form that helps people do the work, rather than introduce harness terminology everywhere.

Some decisions will remain with experienced people. Writing down the repeatable parts helps us see where their involvement still matters.

### 3. Give shared workflows a home

The people experimenting from the bottom up can show what might be useful. They cannot settle every question about permitted data, supported tools, or responsibility across a company.

For example, imagine two developers have built a useful AI-assisted code review workflow. I would want company support to make it available beyond their laptops: clarify whether the tool may receive client code, give them time to package it for another team, and agree who handles updates. In a small company, the same team lead might coordinate all of this. The responsibilities need a home; they do not each need a new job title.

Without that support, the original author can become an unofficial help desk. They answer setup questions, explain exceptions, and repair the workflow when something changes, alongside their existing work. I would like sharing an improvement to come with a way to distribute its maintenance too.

Debois calls the supported options “paved roads”. Platform or Developer Experience teams can provide maintained components instead of leaving each team to build its own. He allows several paths, with teams choosing what fits. I would carry that flexibility into the wider company: a marketing workflow and a finance workflow need different expertise and review boundaries, even if they use some of the same tools.

Support also includes a conversation about expectations. If management treats each time-saving experiment as an immediate commitment to higher output, people may become reluctant to share unfinished work or difficulties. I would want colleagues to know what we are trying to learn and how we will discuss changes to their roles. We may not have all the answers yet, but those questions belong in the introduction of the workflow.

### 4. Learn from real use

Once another person starts using the workflow, we can see which parts still depend on knowledge we forgot to share.

Debois describes engineering retrospectives shifting towards problems in the system: where did the agent get stuck repeatedly, and what could the team improve? He also describes planning that separates sufficiently scoped work from tasks that still need conversation.

I would apply the same questions in another department. Suppose colleagues keep correcting outdated product details in AI-generated customer replies. I would look at which product information the workflow supplies and how it stays current. That gives us something to improve before the next draft, instead of leaving each colleague to catch the same mistake.

Debois suggests tracking human interventions and the reach of shared improvements. I find those useful indicators of whether the workflow is becoming easier to use. I would distinguish a repeated rescue from an approval we intend to keep. Fewer interventions only help if we still produce work that people can accept.

Costs belong in that review too. Debois recommends making them visible and helping teams optimise model choice, context, and iteration count. I would look at those costs alongside review effort and rework. A fast first draft may offer little benefit if a colleague has to spend longer verifying it than they would have spent doing the task.

I would also follow the work into the next department. Debois points out that requirements can arrive too slowly and downstream colleagues can struggle to keep up with increased output. Before expanding a workflow, I want to know whether it helps the people receiving its results.

### 5. Delegate according to risk

Near the end of his talk, Debois uses the term “dim factory”. It borrows from the idea of a dark factory: an automated manufacturing facility where no people need to work on the floor, so the lights can stay off. Applied to software, the vision is that agents take requirements through implementation, testing, and deployment without human intervention.

Debois dims that ambition. People choose how much autonomy to allow based on the risk of a particular feature or task. Some activities can run with little involvement; others retain human judgment and approval. In the talk, this is a metaphor for those choices, rather than a detailed operating model.

Donovan Crewe develops the idea further in [“The Dim Factory”](https://www.linkedin.com/pulse/dim-factory-lumenalta-k5rxc/). He describes agents working within defined inputs, validation criteria, and enforced constraints. Engineers build and maintain those controls, monitor behaviour, and intervene where the workflow needs them. I find that a useful description of the engineering involved: a security rule becomes a pipeline check, and a release boundary becomes an approval gate. Those controls address specific risks; they do not make every generated result trustworthy.

For colleagues outside engineering, I would start with the practical question behind the metaphor: which parts of this workflow can we delegate, and where do we want a person to remain involved? We do not need to agree on a factory as the destination to answer that together.

I might be comfortable with AI preparing a draft for internal discussion while keeping a person responsible for sending a customer commitment. In development, I can give an agent room to work in an isolated environment while retaining approval for a production change. Those are different decisions because the consequences differ.

Debois connects this to auditing, verifiers, and situational awareness. We need to understand who or what changed something, whether the result meets our requirements, and what happened when it failed.

For a company workflow, I would want the people using it to know where they can inspect the work, when to pause, and who can resolve a problem. We can then adjust the degree of delegation based on experience with that particular task.

The experienced colleague still has a role here. They can help identify which consequences matter and where the evidence is strong enough to trust the workflow with more responsibility.

## Infrastructure for learning from each other

As a consultant, I help programming teams work with AI together. Debois gives me a useful way to think about the infrastructure around that work. A few people may already be exploring what is possible. With shared context, maintained tools, and a way to contribute improvements, more people can build on what they discover.

I would want a developer to find a supported workflow and contribute improvements as they use it. For example, a second team adopts the shared review workflow and notices that it misses an authorisation check. They contribute a test case and improve the review instructions through a pull request. After review, the first team can use that improvement too. That is the exchange I want to help establish through shared skills, versioned project knowledge, and tested harness components.

Leadership and platform support give that exchange continuity. They can provide ownership, maintenance time, and the infrastructure through which teams publish, find, and improve these capabilities. The people experimenting contribute their experience; they do not have to carry adoption across the company on their own. Colleagues joining later bring domain knowledge and new cases that can improve the shared approach in turn.

That is what I take from Debois after the third viewing. The progress of a few people can become accessible to others, and those others can help develop it further. In my consulting work, I want to help teams establish that contribution path alongside their coding workflow. The boundary to work out is which capabilities we can maintain together and which need to stay close to a particular team’s domain. A shared registry gives us somewhere to put them; the ongoing work is making them useful enough to adopt and straightforward enough to improve.
