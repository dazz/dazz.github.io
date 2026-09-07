---
title: "O is for Ontology"
date: 2026-01-28T09:00:00+02:00
tags: [ontology]
image: ontology.jpg
comments: true
toc: false
---

I have developed my own YouTube video transcript RAG. I wanted to read summarized transcripts as blog posts, but when I was at the stage that the blog posts appeared in my blog right after a video that I had in my subscriptions was published I thought that I also would like to have all the content accessible for AI so I could ask an LLM about topics of the videos my system had consumed and an LLM would answer with all the references back to the videos where a piece of information was found.

The RAG pipeline part was easy:

- get transcript
- split into chunks
- enrich with metadata
- vectorize each chunk

Then I build a feature in the application to have a conversation about the video content with an LLM and it worked awesome.

But RAG has some flaws. It can only find what you know how it named, since it has to vectorize the question, search with those vectors and the result is fed 
to an LLM which generates an answer from those results.

The next logical thing to do is building a GraphRAG. I did not know that the rabbit hole would be that deep and would have so many tunnels.

Things I learned:

## 1. Check your data

I thought I had figured it all out and then discovered that the summaries of chunks I extracted the entities and relations from were not good. It took 2 days to figure out which model would give me good summaries. It took three days to rerun generation for all summaries. 

And a few days ago I found out that the ChapterChunker does not do the 20% overlap which is mandatory for finding in RAG. I can not simply rebuild those since that would mean all the chunk-summaries, vectors, extractions and all that would need to get rebuild again as well.

## 2. Experiment and Compare before you code

AI tricks you into thinking that "of course, d'oh" everything we do here is the way things are done. But when the results are bad you need to find out why. In my case, I wanted to extract entities and relations of the transcript chunks. AI wanted to use the summary and I did not know better so we started with those. While reading about how to extract entities from text I discovered ontology. And no, this has nothing to do with birds. Its about ...(fill facts).

So the plan to extract entities changed to do a bottom up ontology

1. discover candidates from many videos 
2. induce an ontology schema from it 
3. extract entities from chunk
4. check them against ontology schema
5. store entities
6. persist entities with relations to neo4j
7. win

Then I thought it would be better to split up discovery in two prompts, first the entities, then from that the relations. It made everything more complicated. 
Also I discovered that reading the discovered candidates in a relational database makes it hard to compare.

I build a feature in my application to make all prompts visible, and I can select from a list and a form is build for filling out all the placeholders. Then I can select a model from the list. For having a better overview I also created a page in the application that gives me specs and insights so I know I am using the right ones in my experiments.

The results were still not overwhelming, but queriing the models not with curl, but from within the application made me discover that although the model has thinking capability it was not actively enabled which you need to do with ollama.

Having a way to test the prompts and do experiments helped me tremendously selecting a model for a specific task and I have to say, this is the part that is fun and annoying at the same time.

## 3. Quality takes time, a lot of time. And time is money.

 Extracting knowledge from text runs up to 5 minutes for every text, of course depending on the model. Selecting a big model would increase the time, taking a smaller model decreases the quality, so the goal is to find the smallest model that you can live with the quality of output.

I found out that I have to configure the timeouts of my system to wait for a long time, up to 6 minutes so I would not get timeouts during synchonous experiments.

## 4. Know the limits

But there are more parts to it. A model has a context length it can process. If the input is to big then it will get truncated and the model again will act on not all the information. But bigger is not better as it depends on the attention. If a model has not been trained to follow instructions and understand the system prompt and apply it on the input then the big context is really not helping.

Some models come with their own system prompts that mix in, some models look very promising and then do not even understand to answer with JSON, not with JSON in markdown quotes ... Yes, I was very specific in my prompt but it still would not comply.
