---  
title: "I Thought I Needed Better Prompts. I Needed a System."
date: 2026-01-17T09:00:00+02:00
tags: [workflow, ai, ai engineering, application, application layer]
image: hero.png
comments: true
toc: false
---

I don't learn well from videos. Too much friction—pausing, rewinding, hunting for that one command buried in a 45-minute timeline. Last summer, I decided to build my way out of it.

### The Initial Win

The plan was straightforward: feed video transcripts to an AI, extract clean Markdown, commit to Git. Not even a proper application—just something I could consume via RSS instead of watching videos.

The first results were surprisingly good. The AI captured structure and nuance well enough that I kept going. For a brief moment, it felt like I'd solved the problem.

Then came the real work.

### When Manual Steps Became the Bottleneck

The AI quality wasn't the issue. Everything *around* it was.

I was trapped in a loop: copy-paste transcripts, update video IDs in a Makefile, trigger Python scripts, verify output, repeat. The actual AI call represented only a fraction of the effort. The rest was me playing human cron job.

As content accumulated, the Markdown files became unmanageable. No cross-file search. No metadata. No deduplication. The moment I needed to ask "which video mentioned this specific technique?" the whole approach collapsed.

A database wasn't a feature. It was the structural requirement I'd been avoiding.

### From Script to System

I didn't need better scripts. I needed something that could discover content, process it, store it, and make it queryable—without manual intervention at every step.

This forced me to think about maintainability and evaluation. I moved the entire project to **PHP and Symfony**. Not because it's trendy in AI circles (it's not), but because I needed to build something I could maintain, debug, and reason about six months later. When Symfony released their AI packages, the orchestration layer finally made sense.

PostgreSQL with pgvector for embeddings and Neo4j for knowledge graphs. Everything in an environment designed for long-term stability.

{{< admonition type=symfony title="symfony/ai" >}}
Symfony AI is a set of components that integrate AI capabilities into PHP applications, providing a unified interface to work with various AI platforms like OpenAI, Anthropic, Google Gemini, Azure, and more.

See https://symfony.com/doc/current/ai/index.html
{{< /admonition >}}

### Engineering Over Magic

Here's what became clear: "knowledge extraction" sounds like a single AI task. It's not. It's a pipeline with distinct stages:

1. **Gather** – Fetch transcripts, manage metadata
2. **Normalize** – Chunk at semantic boundaries, disfluency Removal 
3. **Transform** – Extract entities and relationships
4. **Store** – Vectors and graphs
5. **Retrieve** – Routed search methods

**Most of these stages have nothing to do with AI.**

The breakthrough came when I stopped chasing the perfect prompt. I built a **TranscriptChunker** service that preserves timestamps and context. A **triplet extraction pipeline** that pulls structured relationships from text. An **evaluation system** to measure whether any of it actually works.

Chaining specific, isolated AI calls produces more reliable results than one massive "do everything" request. If your input data is messy or your pipeline logic is flawed, no amount of prompt engineering will save you.

### What Actually Matters

AI fails silently and gracefully. Without proper evaluation, you can't tell the difference between "looks good" and "actually works." Without tracing, you can't debug where extraction went wrong. Without structure, you have a demo, not a system.

The architecture surrounding the AI calls matters more than the calls themselves. Database schema design. Chunk boundary decisions. Metadata preservation. Error handling. These are application problems, and they're where most AI projects quietly fall apart.

I'm still figuring out the optimal patterns. The industry's collective knowledge is scattered across blog posts, papers, and half-finished repos. But my focus has permanently shifted: less time optimizing individual prompts, more time building the system that makes those prompts repeatable, traceable, and maintainable.

That's the work that scales.

