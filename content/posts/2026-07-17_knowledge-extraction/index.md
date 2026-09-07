---
title: "Four Ways to Extract Knowledge from Unstructured Data (and Why RAG Isn't One of Them)"
date: 2026-07-17T23:42:27+01:00
tags: [LLM, AI, knowledge extraction, RAG, ontology]
image: knowledge-extraction.png
comments: true
---

## The problem: knowledge trapped in the unstructured

Every video you watch, every long-form article you read, every podcast transcript sitting in a folder somewhere contains knowledge that is, structurally speaking, in the worst possible shape for reuse. It's linear. It's redundant. It's mixed with filler, tangents, and repetition. The same concept might be explained three different ways across forty minutes, buried between an ad read and a rambling aside about the weather. If you want to *use* that knowledge later — cite it, search it, connect it to something you learned six videos ago, hand it to an agent as durable context — you cannot use the transcript directly. You have to extract.

This is a narrower and more specific problem than "how do I build a chatbot over my documents." It's tempting to conflate the two, because in 2024–2026 the default answer to almost any "I have a pile of documents and want to do something smart with them" question has become *just RAG it*. But extraction and retrieval are different problems, and building a system that treats them as the same thing tends to produce something that's good at neither: a search index dressed up as a knowledge base, or a knowledge base that only reveals its contents through a chat window.

The distinction that matters is this: **extraction asks "what is the durable, reusable knowledge in this source, and what form should it take so a human or an agent can consume it without re-processing the source?"** Retrieval — RAG — asks a completely different question: **"given a query right now, what's the most relevant material to feed an LLM so it can answer?"** The first produces an artifact. The second produces an answer. You can build the second on top of the first, but not the other way around, and treating them as interchangeable is where a lot of "AI knowledge base" projects quietly go wrong.

This post walks through four real approaches to this problem — Triplet Extraction, RAG, Ontology-style entity resolution, and OKF (Open Knowledge Format) — grounded in an actual system that implements three of them against the same source material: video transcripts from a YouTube-monitoring pipeline called DazzHub. Rather than treat these abstractly, every claim below is backed by a real run: real extracted triplets, a real generated OKF document, and real cluster data from an ontology experiment.

The video used as the running case study across three of the four sections is *"Context Is the New Code"* by Patrick Debois (Tessl), a talk about treating AI-agent context — prompts, instructions, specs, skills — as an engineered software artifact with its own development lifecycle. It's a good test case precisely because it's dense with named concepts, has a clear conceptual thesis, and overlaps thematically with material already processed by other parts of the same pipeline.

---

## Triplet Extraction: knowledge as an edge list

### What it is

Triplet extraction is the most structurally minimal of the four approaches. You give an LLM a chunk of text and ask it to output a list of `(subject, predicate, object)` statements — the same shape as an RDF triple, the atomic unit of a knowledge graph. In the system studied here, the schema is deliberately constrained: a fixed enum of roughly ten entity types (`person`, `technology`, `concept`, `method`, `event`, `product`, and a few others) and exactly six predicates: `is_a`, `part_of`, `uses`, `requires`, `enables`, `applies_to`.

This is a real design decision with a real tradeoff. An open predicate vocabulary — let the LLM invent whatever relationship name fits — gives you expressiveness: "Patrick Debois *pioneered* DevOps" is more informative than forcing it into `uses` or `enables`. But an open vocabulary also gives you an explosion of near-duplicate predicates (`created`, `invented`, `pioneered`, `originated` all meaning roughly the same thing) that make the resulting graph nearly impossible to query consistently. A closed, small predicate set buys you exactly the opposite: every edge in the graph is guaranteed to be one of six types, which means you can write a Cypher query like "find everything that `enables` X" and trust that it will actually match semantically similar statements phrased differently in the source text, because the LLM was forced to normalize at extraction time rather than leaving normalization as a downstream problem nobody solves.

### What it actually produced

Running this extractor against all 18 transcript chunks of the Patrick Debois talk (using gpt-5.2) produced 296 distinct triplets. The predicate distribution tells you something real about what this kind of extraction is *actually* good at capturing:

| Predicate | Count | Share |
|---|---|---|
| `uses` | 76 | 25.7% |
| `enables` | 69 | 23.3% |
| `applies_to` | 57 | 19.3% |
| `requires` | 56 | 18.9% |
| `is_a` | 20 | 6.8% |
| `part_of` | 18 | 6.1% |

Notice what's *not* well represented: `is_a` and `part_of` — the two predicates that build an actual taxonomy or hierarchy — make up under 13% combined. The graph this produces is overwhelmingly relational-procedural ("X uses Y," "X enables Y," "X requires Y") rather than hierarchical. That's not necessarily wrong — a talk about context engineering is more about workflows and dependencies than about class hierarchies — but it means you shouldn't expect a triplet-extraction pass to hand you a clean ontology for free. It gives you a graph of *how things relate procedurally*, not *what kind of thing something is*.

The more interesting — and more honest — finding is a quality issue that shows up immediately on inspection. A meaningful fraction of the extracted triplets look like this:

```
Patrick Debois (person) --uses--> skill (concept)
Patrick Debois (person) --uses--> parallel thinking (method)
Patrick Debois (person) --uses--> Context is the New Code (event)
Patrick Debois (person) --enables--> helper code conversion into skill (concept)
```

Roughly a quarter of all 296 edges have the speaker himself as the subject. This is a completely faithful extraction — the source material really does describe Patrick Debois using and enabling these things — but it's a subtly different thing from *durable knowledge*. "Patrick Debois uses parallel thinking" is a fact about a talk, not a fact about the world you'd want sitting in a knowledge base six months later disconnected from its source. It's the triplet-extraction equivalent of a transcript that never lets go of its own narrator: every statement is anchored to "the person talking," rather than being lifted out into a speaker-independent claim like "parallel thinking (method) → applies_to → context engineering (concept)," which the same extraction pass *also* produced, correctly, elsewhere in the same run.

This is not a flaw unique to this implementation — it's close to structurally inevitable for chunk-level triplet extraction done without an explicit instruction to strip speaker attribution, because from the LLM's point of view, "the speaker did/used/enabled X" is exactly as true and exactly as extractable as any other claim in the transcript. Fixing it isn't hard (a prompt instruction to prefer the depersonalized claim when both are present, or a post-filter that drops edges where the subject is a `person` type matching the known speaker), but it's a real, concrete illustration of a general truth about triplet extraction: **the schema constrains form, not judgment.** You still need a second pass — a prompt refinement, a filter, or a human — to separate "this is durable knowledge" from "this is faithfully what was said."

### Where it lives, and what it's for

Structurally, these triplets get written to a `knowledge_graph` JSON column on the source chunk and then synced into Neo4j, where entities are merged by `{name, type}` and relationships accumulate a `source_chunk_id` array so the same relationship discovered independently in five different chunks — or five different videos — collapses onto one edge rather than creating five duplicates. This is real, working, exact-match deduplication: mention "Retrieval Augmented Generation (concept)" in three different chunks and you get one node, not three, with three source citations attached.

That's the ceiling of what this dedup mechanism can do, though: it's a string-equality merge on a normalized label. "RAG," "retrieval augmented generation," and "Retrieval-Augmented Generation" will only merge if something upstream normalizes them to the same string first. It has no notion that "encoder-based retrieval" and "Retrieval Augmented Generation" are the same underlying concept described two different ways — that's a semantic-similarity problem, and triplet extraction alone doesn't solve it. (We'll come back to who does.)

What triplet extraction is genuinely good for: feeding a graph database that supports relationship queries and graph algorithms — shortest-path reasoning, "what depends on what," GraphRAG-style retrieval where you walk relevant edges instead of doing pure vector search. It's the right tool when the *shape of the relationships* is the thing you want to query, not when you want something a human reads top to bottom.

---

## RAG: not an extraction method, an access pattern

### What it actually is

Retrieval-Augmented Generation deserves a section here specifically *because* it's so often treated as a peer alternative to the other three approaches, when it structurally isn't one. RAG is: at query time, retrieve some relevant material from a store, stuff it into an LLM's context window alongside the user's question, and generate an answer. That's it. Nothing about that definition says anything about *how the store got populated* or *what form the knowledge takes inside it*.

This matters because the store RAG retrieves from can be almost anything. The most common setup — chunk raw documents, embed the chunks, do vector similarity search — is really "RAG over raw, unprocessed text," and it inherits every weakness of unprocessed text: no deduplication, no cross-document concept resolution, no distinction between the two paragraphs that actually matter and the eight that are filler, because nothing was ever *extracted* — only *chunked and indexed*. You can equally well run RAG over a collection of OKF documents (retrieve the curated concept summaries instead of raw transcript chunks — sharper signal, less noise), or over triplet-extracted graph data (this is what "GraphRAG" specifically means: instead of vector-searching chunks, you walk the graph structure — communities, entity neighborhoods — to assemble context, which is exactly what Microsoft's GraphRAG architecture and the Ontology pipeline described below both do). RAG is the delivery mechanism. It is agnostic to — and entirely dependent on the quality of — whatever sits underneath it.

### The category error

Here's the concrete failure mode this framing is meant to prevent: a team decides they want "a knowledge base of everything we've learned from our video library." They stand up a vector store, chunk the transcripts, wire up a chat interface, and call it done. Ask it a question and it gives you a reasonable-sounding answer, stitched together from three retrieved chunks, and it *feels* like the knowledge has been captured. But nothing has actually been extracted. There is no artifact you can browse. There is no deduplicated concept list. There is no way to answer "what does this corpus know about X" except by asking the chatbot and hoping the retrieval step surfaces the right chunks — and if the same concept was mentioned in twelve different videos with twelve different phrasings, the chatbot might synthesize a coherent-sounding answer from three of them and never surface the other nine, with no way for you to know that happened.

RAG optimizes for "answer this specific question well, right now." It does not optimize for, and typically does not produce, "here is the browsable, citable, deduplicated body of knowledge this corpus contains." If what you actually want is the second thing, doing RAG *instead of* extraction doesn't get you there faster — it just defers the extraction problem to query time, every time, forever, without ever paying down the debt. The chatbot experience can feel like a substitute for a knowledge base right up until you need something a chatbot can't give you: an exportable dataset, a static page you can skim, a citation trail you can audit, or confidence that "no answer was found" actually means "this isn't in the corpus" rather than "the retrieval step didn't surface the right three chunks this time."

None of this is an argument against RAG. It's an argument for knowing which problem you're solving. If the product is genuinely "let a user ask ad-hoc questions of a large corpus," RAG — ideally layered over one of the three extraction approaches below rather than over raw chunks — is exactly right. If the product is "produce a knowledge base people and agents can browse, cite, and build on independent of any specific question," RAG is the wrong layer to start with, because it's not building anything that persists.

---

## Ontology: the heaviest machinery, and the only one that really resolves entities across sources

### The pipeline

Of the four approaches, Ontology-style extraction is the only one that attempts genuine cross-source entity resolution — recognizing that "the thing mentioned in video A" and "the thing mentioned in video B" are the same concept, even when phrased differently, and merging them into one canonical node with both sources cited. That capability is valuable enough to be worth its considerable complexity, so it's worth walking through the full pipeline as it actually runs:

1. **Candidate discovery.** An LLM pass over each video (or transcript chunk) identifies candidate ontology classes and properties — raw, unresolved mentions, each carrying a verbatim evidence quote and a confidence score. This stage is isolated per source; nothing is merged yet.
2. **Embedding generation.** Every candidate gets a vector embedding (pgvector), turning "raw label similarity" into something a distance metric can operate on.
3. **Global clustering.** Candidates of the same kind (class vs. property) are clustered by cosine similarity across the *entire* candidate pool — not per video, globally — with a configurable similarity threshold (0.85 in this system). This is the actual cross-source merge step: two mentions of conceptually the same thing, embedded close together regardless of which video they came from, land in the same cluster.
4. **LLM coherence validation.** Because embedding similarity alone can be wrong — near-neighbors in embedding space aren't always the same concept — an LLM pass checks each cluster for internal coherence and can split it into sub-clusters if it's actually conflating two distinct ideas.
5. **Hierarchical community detection.** Validated clusters become nodes in a graph (edges derived from validated property relationships), and a Leiden community-detection algorithm groups them into three hierarchical levels of topic communities.
6. **LLM community reports.** For each detected community, an LLM pass generates a title, summary, and key-themes digest — essentially the "so what does this cluster of concepts, spanning however many sources, actually mean" step.
7. **Neo4j export + GDS.** The resolved entity/community graph is pushed into Neo4j, where a real Graph Data Science call (`gds.node2vec.stream`) computes structural embeddings for downstream use.

### What actually happened when this ran

The numbers from the real experiment this system ran are worth sitting with, because they're a useful corrective to how clean this sounds in the abstract. Across four videos, the pipeline produced 1,031 raw candidates, resolved into 284 clusters, grouped into 280 communities — and only 19 of those 284 clusters actually merge candidates from more than one of the four source videos. The other 265 are single-video clusters that happen to have survived the clustering step without finding a cross-video match, simply because the four source videos covered different enough topics (knowledge graphs vs. vector databases, multimodal models, BERT, technical-document summarization) that most concepts genuinely didn't recur. Of the 280 communities, only 8 have an LLM-generated report — report generation is feature-flagged off by default, so unless someone manually triggers it, you get the structural clustering with no human-readable digest layered on top.

Where it *did* work is genuinely compelling. One of the 19 cross-video clusters resolved to the canonical concept "Retrieval Augmented Generation," correctly merging 13 separate mentions from two different videos — one about knowledge graphs versus vector databases, one about BERT — including phrasings as different as *"traditional retrieval augmented generation systems... has really become a core component"* and *"you've likely interacted with encoder based models through the form of retrieval augmented generation."* Two videos, on two different topics, both mentioning RAG in passing, correctly recognized as talking about the same thing and merged into a single node with both sources cited. That is the actual value proposition of this whole approach, demonstrated concretely: not "extract facts," but "recognize that this fact and that fact, from different sources, are the same fact."

### The cost of that capability

That result is real, but so is the cost of getting it. This is a six-stage pipeline requiring a vector database, a graph database, a graph algorithms library, a custom community-detection implementation, and at least three separate LLM calls per candidate lifecycle (discovery, validation, and — optionally — report generation). The Leiden community-detection implementation in this system is explicitly documented in its own code comments as a *"simplified, didactic implementation,"* not a call to Neo4j GDS's production Leiden/Louvain algorithms — and the hierarchical level-2 recursion is, as of this writing, an unimplemented stub. Real GDS is used, but only for the node2vec structural-embedding step, which is a downstream enhancement on top of the resolution mechanism, not the resolution mechanism itself.

The project this was built for paused the entire ontology effort after this experiment, for reasons worth stating plainly because they're common and not unique to this codebase: the local LLM being used for candidate discovery was slow enough that iterating on the pipeline was painful, and the owner wasn't confident the resulting cluster/community quality was good enough to justify the machinery — a reasonable conclusion to reach after actually building the thing and looking hard at the output, rather than a reason to have not built it at all. Real cross-source entity resolution is valuable. It is also genuinely expensive to build well, and "built but unvalidated" is a meaningfully different state than "built and trustworthy."


## OKF: the readable one, isolated per source

### The design

Open Knowledge Format takes the opposite bet from Ontology: instead of resolving entities across many sources through a multi-stage pipeline, do one clean LLM call per source and force the output into a structured, human-readable document. The system prompt driving this extraction is explicit about the philosophy: *"CURATE, DON'T TRANSCRIBE: capture durable knowledge (concepts, facts, definitions, relationships), not narration, filler, or chatter,"* and *"NEUTRAL VOICE: state knowledge directly; never write 'the video,' 'the creator,' or 'this episode.'"* The output schema is a YAML-frontmatter markdown document: a `type` (always `"video-knowledge"`), `title`, `category`, `confidence` (high/medium/low), `tags`, a short `summary`, and then structured lists — `keyConcepts`, `facts`, `definitions`, `relatedConcepts` — each rendered as a markdown section.

Run against the Patrick Debois talk, this produced a document that opens:

> AI-assisted software development increasingly depends on engineered "context" (prompts, instructions, specs, retrieved docs, skills) as a primary artifact that drives agent behavior. A context development lifecycle mirrors SDLC/DevOps loops: generate context, test/evaluate it with deterministic-like harnesses, distribute it as reusable packages, and observe outcomes via logs and production feedback to iteratively improve.

— followed by key concepts like "Context as a first-class software artifact," "Nondeterminism-aware CI for evals" (with the concrete detail that the same eval run multiple times can yield different outcomes and should be evaluated statistically rather than pass/fail), and definitions like *"Skill: a packaged, reusable unit of context... intended to be installed/used by agents across projects; analogous to a software library/package."*

Read that against the triplet output from the same video — `Patrick Debois (person) --uses--> skill (concept)` — and the difference in *legibility* is immediate. One requires you to reconstruct meaning from an edge list. The other is a paragraph you can read in fifteen seconds and understand the actual argument of the talk. For a human trying to quickly grasp "what was this video actually about," OKF wins decisively, and it's not close.

### The limitation

The catch is exactly the thing Ontology was built to solve and OKF doesn't attempt: this document lives entirely on its own. There is one OKF file per video, generated independently, with no mechanism to notice that "Skill: a packaged, reusable unit of context" in this video's OKF and whatever the *next* video's OKF says about skills are talking about the same concept. If you process five hundred videos and eighty of them touch on "context engineering" in some way, you get eighty separate, redundant explanations of context engineering, scattered across eighty files, each written as if it were the only source that ever mentioned it. There's no cross-referencing, no canonical entry, no way to ask "show me everything the corpus knows about skills" except by opening every file and reading them all.

This is precisely the tension between the two approaches sitting side by side: OKF is legible but siloed; Ontology is resolved but heavy, complex, and — in this system's current state — not yet trusted enough to run unsupervised. Neither, on its own, is quite the thing you want if the goal is a genuinely browsable knowledge base that doesn't duplicate itself into uselessness at scale.

## The synthesis: concept files, or OKF's simplicity with Ontology's memory

There's a middle path here that's worth spelling out, because it falls directly out of naming what each approach gets right and wrong. OKF's strength is that creating a document is *cheap*: one LLM call, one clean markdown artifact, easy to reason about, easy to read. Ontology's strength is that it *remembers*: a new mention of a known concept doesn't create a duplicate, it strengthens an existing canonical node with a new citation. The expensive, fragile part of Ontology isn't the remembering — the embedding-similarity lookup that decides "have we seen this concept before" is a single, well-understood, already-working piece of infrastructure (pgvector cosine similarity against existing candidate embeddings). The expensive, fragile part is everything built *on top* of that lookup: hierarchical Leiden community detection, a custom graph-clustering implementation, Neo4j synchronization, GDS node2vec embeddings, multi-phase LLM cluster validation. None of that machinery is required to answer the simple question "does this concept already have a file, or do I need to make one."

So: keep OKF's granularity change from "one document per video" to "one document per *concept*," and keep OKF's single-clean-LLM-call philosophy for producing each document — but add exactly one new piece of machinery, reused wholesale from Ontology: an embedding-similarity check run against existing concept files before deciding whether to create a new one or update an existing one.

Concretely, the flow becomes: extract candidate concepts from a new video (a lighter-weight version of what OKF's `keyConcepts` extraction already does); for each candidate, look up its embedding against the existing concept-file store; below the similarity threshold, generate a new concept file with a single LLM call, identical in spirit to how OKF documents are generated today; above the threshold, fetch the existing concept file and make a *second* single LLM call — not a re-generation from scratch, but a targeted merge — asking the model to fold the new video's evidence into the existing file, extending its facts and definitions where the new source adds something and leaving the rest untouched. Every concept file's frontmatter carries a `sources` list — which videos, at which timestamps, contributed to this concept — and, symmetrically, every video record carries the reverse index: which concept files it touched. Two lookups, either direction, no graph database required for the base case.

This sidesteps Ontology's heaviest and most experimental layers entirely — no Leiden community detection, no Neo4j export, no GDS — while still solving the actual problem OKF can't: read the concept file for "context development lifecycle" and see, in one place, every video that discussed it, rather than opening eighty separate per-video documents to reconstruct the same picture by hand. It's a smaller bet than rebuilding trust in the full ontology pipeline, and it inherits OKF's core virtue — every artifact stays something a human can open and read in under a minute — while adding the one capability that actually matters for a knowledge base that's meant to grow: knowing when you've already learned something.

## A practical decision framework

None of these four approaches is strictly better than the others — they answer different questions, and the right choice depends heavily on who or what is going to consume the output.

| You want... | Reach for... | Why |
|---|---|---|
| A chatbot that answers ad-hoc questions over a large, growing corpus | **RAG** (ideally over OKF documents, concept files, or a graph — not raw chunks) | Retrieval is the right access pattern for arbitrary queries; just don't mistake it for having done extraction |
| A single document you can skim to understand what one source covered | **OKF** | One clean, readable artifact per source; cheapest to produce, easiest to trust |
| A browsable, deduplicated personal or team knowledge base that grows across many sources without duplicating itself | **Concept files** (OKF's simplicity + a similarity lookup) | Gets you cross-source memory without Ontology's full weight |
| To run graph algorithms, relationship queries, or build a GraphRAG retrieval layer | **Triplet extraction → graph DB** | The fixed predicate schema is exactly what makes graph queries reliable; just watch for speaker-attribution noise and consider filtering or reframing subject-is-the-narrator edges |
| Fully resolved canonical entities across hundreds of sources, with rigorous multi-phase validation, and you can afford to build and maintain real infrastructure for it | **Ontology** (candidate → cluster → community → report) | The only approach here with genuine, demonstrated cross-source entity resolution — but budget for the complexity, and validate quality before trusting it unsupervised |

The failure mode to avoid in each direction is symmetric. Reaching for RAG when you actually wanted a knowledge base gets you a chatbot with amnesia about its own contents — no browsable artifact, no audit trail, no way to know what wasn't retrieved. Reaching for full Ontology machinery when you actually wanted "don't repeat myself across documents" gets you six new subsystems, a custom graph-clustering algorithm to maintain, and — per the real numbers above — a nontrivial chance that most of your sources won't overlap enough to justify the cost. Reaching for triplet extraction when what you wanted was something readable gets you a technically correct edge list nobody wants to read. And shipping only OKF at scale gets you a library of excellent, siloed essays that never talk to each other.

## Closing: the tradeoff is always legibility versus rigor

Step back from the specific implementations and a single axis explains most of the differences above: every one of these approaches trades off how *legible* its output is to a human against how *structurally rigorous* it is for a machine to reason over. OKF sits at the legible end — genuinely readable prose, at the cost of zero cross-source structure. Triplet extraction sits near the rigorous end — a clean, queryable edge list, at the cost of being nearly unreadable as prose and blind to synonymy. Ontology tries to buy both — readable community reports *and* resolved entities — and pays for it in genuine engineering complexity, with results here that are real but not yet validated at production quality. Concept files are a bet that you can buy back most of Ontology's memory without most of its weight, by being deliberate about which 20% of the machinery actually does the load-bearing work.

There is no version of this that gets you legibility and rigor and simplicity all at once for free. The right move is naming, honestly, which one your actual use case needs most — a human skimming for understanding, a machine walking a graph, or a system that needs to remember what it already knows the next time it sees the same idea again — and building for that, rather than reaching for whichever of the four happens to be the current default answer to "we have unstructured data, now what."
