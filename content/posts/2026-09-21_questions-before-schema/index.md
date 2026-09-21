---
title: "I Tuned My Extraction First. The Questions Should Have Come First."
date: 2026-09-21T16:00:00+01:00
tags: [ai, symfony-ai, knowledge-graph, evaluation, ollama, workflow, software-development]
image: hero.png
comments: true
toc: false
---

A while ago I wrote that I had moved my transcript pipeline onto PostgreSQL with pgvector and Neo4j, and that this was about building a foundation rather than over-engineering. I still think that was right. What I did not check, for months, was whether anything ever read the foundation.

This is the story of two days spent making a knowledge graph better, and the twenty minutes at the end that told me which questions I should have started from.

## The Crash That Was Not the Bug

A worker died with a message I did not recognize:

```
Cannot json decode the content.
```

The stack trace went into `symfony/ai-platform`, not into my code. My own parser, the one with careful markdown-fence stripping and a friendly error message, never ran at all.

Passing `response_format` to the agent makes the platform wrap the result converter, and that wrapper calls `json_decode` with `JSON_THROW_ON_ERROR` before my parsing gets a turn. The cleaning branch I had written had been dead code for months.

A sibling class in the same codebase already had the fix, with a comment explaining exactly this situation. Ollama takes the JSON schema in its own `format` option instead, which switches on grammar-constrained decoding and gives you back a normal text result.

Somebody had hit this before me and written it down. That somebody was me.

{{< admonition type=tip title="I learned" >}}
When two classes do the same kind of work and only one of them was ever debugged in production, read the one that was.
{{< /admonition >}}

## The Predicate Landfill

My extraction prompt allowed six predicates: `is_a`, `part_of`, `uses`, `requires`, `enables`, `applies_to`. A transcript summary is mostly opinion, creation, comparison and harm, so the model kept meeting relations that none of the six could express. It never skipped them. It picked the closest one.

```
"Harrison Chase prioritizes outcomes over tools"
  → Harrison Chase --applies_to--> candidate evaluation

"long contexts degrade retrieval accuracy"
  → long context --requires--> retrieval accuracy
```

I tightened `requires` with three counter-examples. The abuse moved to `degrades`. I defined `degrades` properly. The abuse moved to `applies_to`, which then carried fourteen of twenty-six edges on three production chunks.

I call this the **predicate landfill**. Whatever the vocabulary cannot express gets dumped somewhere, and tightening one predicate just moves the pile. You cannot prompt your way out of a missing word, because a wrong edge always costs the model less than an empty answer.

## The Measurement That Was Worthless

So I added three predicates and measured. The numbers said they made everything worse. Precision fell from 0.774 to 0.451, duplicates showed up, one fixture ran out of tokens.

I nearly shipped that conclusion. What stopped me was a detail in the raw output: not one of the three new predicates appeared in any triplet. Not once, across two full runs.

My evaluation harness loaded a schema file I had dumped before the change. Ollama's `format` option is grammar-constrained, so the old enum in that file made the new predicates **physically unreachable** while the prompt had already spent its rules on them. With the enum regenerated, the same prompt went from 23 usable edges to 32, with zero false ones.

In the application, prompt and schema are generated from the same PHP constant, so they cannot drift apart. Only my throwaway harness could get this wrong, and it did.

{{< admonition type=warning title="Grammar-constrained decoding" >}}
With Ollama's `format`, the schema is not a hint. Values outside the enum cannot be produced at all. If a new predicate never shows up in the output, suspect the schema before you blame the model.
{{< /admonition >}}

## Precision Alone Rewards Cowardice

I swept twenty-three installed models. Nine of them returned well-formed JSON with an empty array, including the model that was configured as the default and had therefore been extracting nothing for weeks. The ranking put `qwen3.8:27b` on top: 32 usable edges, zero false ones.

I recommended it, and I was measuring the wrong thing.

Judging each produced triplet gives you precision. Nothing in that setup sees the edges a model never proposed. A model that emits four careful triplets and quietly drops the rest scores beautifully.

Building a gold standard flipped the ranking. `qwen3.8:27b` fell to fourth place, behind two models that found half again as many true claims, because it had produced the fewest triplets of the five.

**If you only score what the model said, you are paying it to say less.**

## Building a Gold Standard Without Losing a Week

Writing the ideal answer from scratch means imagining triplets, and nobody is good at that. Pooling works better, and it is an old trick from information retrieval: run several models over the same texts and treat the union of their output as the candidate set. Five models over five chunk summaries gave me 82 distinct candidates.

Then judge every candidate once, and send only the uncertain ones to a human. My first attempt asked a single question, *does this belong in the ideal extraction*, and left 41 of 82 in the uncertain band. A compound criterion gets a mushy answer. Splitting it into three narrow questions and putting the combining rule in code cut the queue to 26 and grew the accepted set from 32 to 38.

One trap followed. Nine gold edges on one chunk were the same claim in different words:

```
advocates --> involving diverse backgrounds in AI development
advocates --> diverse backgrounds in AI development
advocates --> involving people from various backgrounds in AI development
```

Counted separately they inflate the denominator and punish a model for saying something once. Candidates that share a subject and a predicate now get clustered by word overlap into one slot, and any member of the slot scores it.

The uncertain band resisted every attempt to automate it away. Across 26 candidates the best threshold rule I could find agreed with my own judgement on 17. That band is where the judgement lives. Build a decent review UI for it instead of tuning a rule that pretends it away.

## My Fixtures Were Too Easy

Four of my five fixtures were written by me, in the style of the real ones. On that set the winning prompt reached 93% precision.

Then I ran real chunks, and three of them contained negation:

```
"Jev does not generate text sentences"   → Jev --uses--> text sentences
"Jev is distinct from frontier models"   → Jev --is_a--> frontier model
```

Both edges assert the opposite of the source, and in a graph there is nothing that tells them apart from a true one. On eight real chunks the same prompt scored 62% after human adjudication.

My invented fixtures contained no negation, no contrast, and no long sentences. They were clean, and clean text made a broken prompt look finished.

{{< admonition type=tip title="I learned" >}}
Fixtures I write myself test the code I was already thinking about. Only production text tests the code I forgot.
{{< /admonition >}}

## The Twenty Minutes That Reordered Everything

By now I had three follow-up tickets, a hand-adjudicated gold standard over thirteen chunks and 184 judged edges, a seventeen day runtime estimate for extracting the corpus, and a plan for entity resolution.

Then I went looking for the consumer, and found that the triplets feed a sync job into Neo4j and nothing else. No controller, agent or query handler runs a read against that graph. I had been improving the input to an empty room.

The database also already held most of what I was building. My chunk summarizer writes a `content_tags` array for every chunk, and it has been doing that all along:

```
79,633 of 79,679 chunks carry tags
28,716 distinct tags
```

Those tags already go into the embedded text, so they had been improving semantic search this whole time. One query over that column, in about fifty milliseconds:

```
chunks tagged "GraphRAG" → which tags co-occur?

Claude Code 552 · Knowledge graphs 430 · Model Context Protocol 381
Neo4j 355 · RAG 260 · Tool calling 240 · Codex 222 · Cursor 220
```

That is the neighbourhood of a concept across 79,000 chunks, with counts, traceable back to individual videos.

## The Questions, and Who Answers Them

Once I wrote the questions down instead of the schema, the whole project sorted itself into three tiers. This is the artifact I wish I had started with.

**Answerable today, over the tag column, with no extraction run at all:**

* What is related to X? What are the use cases of X? (tag co-occurrence)
* What is being talked about most? (tag frequency)
* What showed up this month that did not exist in spring? (tag frequency over time)
* Which videos cover the same ground? (tag intersection)

**Needs typed edges, which is what the triplets are actually for:**

* Which **kinds** of software factory are there? (`is_a`, and co-occurrence cannot tell a kind from a neighbour)
* Who built LangGraph? (`created`)
* What does a durable agent require? (`requires`)
* Who has claimed what about X? (`advocates`)

**Needs a graph database, because one hop is not enough:**

* Which tools build on something that builds on LangGraph?
* What connects two entities that never appear in the same chunk?

That last tier is the only one where Neo4j earns its keep, and it is exactly two questions long. Everything above it runs in PostgreSQL.

The list also told me which predicates matter. Of the eight I had been polishing, the typed tier uses four. The rest were me guessing at an ontology before anyone had asked it anything.

{{< admonition type=tip title="I learned" >}}
A schema is an answer. Write down the questions first, and the schema stops being a matter of taste.
{{< /admonition >}}

## What I Take With Me

1. **Write the questions before the schema.** Every hour I spent on predicate semantics went into a layer no query touched. The question list would have told me which four predicates to care about.
2. **Measure recall, or admit you did not.** Precision-only numbers are cheap, and they rank the most timid model first.
3. **Put production data in the fixtures.** My handwritten examples were too polite to break anything.
4. **Price the cheap option before improving the expensive one.** Re-embedding all 79,679 chunks takes half an hour. Extracting triplets over the same corpus takes seventeen days. I improved the seventeen day job for two days before I compared it to the thirty minute one.

The graph is still getting built. It now has a job description of two lines and four predicates, instead of an ontology I invented in advance and defended for a day and a half.
