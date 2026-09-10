---
name: dazzlog-post
description: >
  Write a complete, commit-ready blog post for dazz's personal blog at
  blog.dazzlog.de (a Hugo site) in dazz's own English voice. Use this whenever
  dazz wants to draft, write, revise, or outline a post for dazzlog /
  blog.dazzlog.de, even when phrased loosely ("ich will einen Artikel
  schreiben", "Blogpost über X", "mach mir einen Post aus diesen Notizen").
  The user supplies rough notes in any language (German is normal); the output
  is always an English post composed in dazz's voice, not a translation. Do NOT
  use this for generic blog writing unrelated to dazzlog.
---

# dazzlog-post

Turn dazz's rough notes into a finished, commit-ready Hugo post for
blog.dazzlog.de, written in dazz's English voice.

## Non-negotiables

- **Output is always English**, regardless of the notes' language. Compose in
  dazz's English voice. Treat the notes as raw meaning and lived experience;
  never translate sentence-by-sentence (that produces German-flavored English
  and breaks the voice).
- **Interaction stays in German** (or whatever language dazz writes to you in):
  clarifying questions, the outline, register proposals. Only the post itself is
  English.
- **Never invent lived experience.** dazz's posts are grounded in real friction,
  real decisions, real code. If the notes are too thin to write honestly, ask
  targeted questions (what was the trigger? what went wrong? what's the punch
  line?) instead of hallucinating a story.
- **Never invent a hero image.** Set `image:` to a placeholder filename and tell
  dazz where to drop the file.
- **Headings start at H2.** The title lives in the front matter, so the body
  never uses `#`. Top-level sections are always `##`, in both registers.
  Subsections use `###`.
- **No dashes as punctuation.** No em-dashes (—) and no en-dashes (–) anywhere
  in the post. Rewrite the sentence with a period, comma, colon, or parentheses
  instead; don't just swap the dash for a comma. Hyphens inside compound words
  ("time-saving") are fine.

## Workflow

### 1. Read the notes, gauge substance

Take input in any form: a keyword, rough notes (the normal case), a transcript,
a draft. If there isn't enough real substance to write an honest post, ask 1 to
3 sharp questions before continuing.

### 2. Outline first, in German

Before writing prose, propose (in German) a short outline for dazz to confirm or
redirect:

- **Register**: narrative or how-to (see "Register" below). Propose the one the
  notes lean toward and say why. dazz confirms or flips it.
- **Angle**: the personal hook, the one coined term or core point the post
  turns on. This is what makes or breaks a dazzlog post; get it right before
  writing.
- **Heading beats**: the `##` section headers as a list.
- **Tags**: proposed from dazz's existing vocabulary (see "Tags").

Keep it to a few lines. If dazz says "schreib direkt" / "skip outline", go
straight to writing.

### 3. Write the full post

Emit the complete `index.md` (front matter plus body), ready to commit. Follow
the front matter spec, register rules, and style rules below. Read the matching
reference post for rhythm (see "Reference anchors").

Before emitting, check the body: no `#` headings, top-level sections are `##`,
and not a single em-dash or en-dash.

### 4. State the output location and image reminder

Tell dazz the file path (`content/posts/YYYY-MM-DD_slug/index.md`) and remind
them to drop the hero image into that folder under the placeholder name in
`image:`.

## Front matter

YAML, delimited by `---`. dazz's real conventions:

```yaml
---
title: "Quoted Title Here"
date: 2026-01-19T09:00:00+01:00
tags: [tag-one, tag-two]
image: hero.png
comments: true
---
```

- `title`: always quoted.
- `date`: RFC3339 with timezone offset. Default to the current date/time at
  `+01:00`; dazz can override.
- `tags`: inline array, lowercase (see "Tags").
- `image`: filename only, relative to the post folder. Placeholder unless dazz
  gives one.
- `comments: true`: always present.
- `draft`, `toc`, `description`: optional. Add `toc` based on register (below).
  Add `draft: false` or `description` only if dazz wants them.

## Register

dazz writes in two registers. Pick per post (confirmed in the outline step).
Both use `##` for top-level sections and `###` for subsections.

**Narrative** (reflective, story-driven; see `references/narrative.md`):
- Title = two short declarative sentences, e.g. `"I Thought I Needed Better
  Prompts. I Needed a System."`
- `toc: false`; use `##` headers as narrative beats, `###` for sub-beats.
- Structure: personal-friction opener, then the arc (what I tried, where reality
  disagreed, what I learned), then a "my focus has permanently shifted" style
  close.

**How-to** (technical walkthrough; see `references/howto.md`):
- Title = descriptive, e.g. `"Environment variables in a dockerized Symfony"`.
- `toc: true`; use `##` headers, `###` for subsections.
- Structure: goal, big picture, implementation steps with code, a cheerful
  `## Happy <gerund> everyone` sign-off, optional `### More sources` list.

## Style rules (both registers)

These are dazz's voice. Apply them; don't caricature them.

- First person. Narrative posts open on personal friction/motivation.
- Short, standalone emphasis lines for punch ("It felt like control.").
- **Bold** for coined/named terms (**vibe-trash**, **vibe-code**); *italics* for
  emphasis. Asides go in commas, parentheses, or their own sentence, never
  between dashes.
- Blockquotes as pull-quotes / epigraphs where they land naturally.
- Numbered lists for pipelines/step sequences; bullet lists for surveys of
  options.

### Hugo shortcodes: know them, use them situationally

Available, not mandatory. Reach for them where they genuinely fit; don't stuff
them into every post.

- Admonitions: `{{< admonition type=tip|warning|note|symfony title="..." >}}
  ... {{< /admonition >}}` for warnings, sources, asides.
- The recurring lesson callout `{{< admonition type=tip title="I learned" >}}`
  is part of dazz's narrative voice; use it for a genuine takeaway, not filler.

### Code fences: fixed convention

When code comes from a nameable file, the **first line inside the fence is the
file path as a comment**, e.g. `# app/config/services.yaml` or
`// src/Foo.php`. Always do this when the file is identifiable.

## Tags

Prefer dazz's existing vocabulary; extend cautiously only when nothing fits.
Lowercase, kebab-case. Known tags include:

`ai`, `application`, `bephpug`, `blog`, `bulma`, `c-base`, `cd`, `ci`,
`claude-code`, `css`, `dazz`, `devops`, `docker`, `docker-compose`, `dotenv`,
`env_file`, `first`, `git`, `github`, `github-actions`, `github-packages`,
`guardrails`, `hugo`, `jekyll`, `pydantic-ai`, `s6-overlay`,
`software-development`, `spec-driven-development`, `symfony`, `symfony-ai`,
`tailwindcss`, `ui`, `vibe-code`, `workflow`, `zola`

This list is not exhaustive. If a genuinely new topic needs a tag, coin one in
the same style and flag it to dazz in the outline step.

## Output

Page bundle layout:

```
content/posts/YYYY-MM-DD_slug/
├── index.md   <- the post you write
└── <image>    <- dazz adds this; name matches the `image:` field
```

- `YYYY-MM-DD` = publish date (matches the `date` field's date).
- `slug` = derived from the English title, lowercased, hyphenated. dazz can
  override the slug.

## Reference anchors

Read the reference post that matches the chosen register before writing, to lock
in rhythm and structure. Don't write from the rules alone:

- `references/narrative.md`: reflective, story-driven register.
- `references/howto.md`: technical walkthrough register.

Both reference posts predate the heading and dash rules: `narrative.md` uses
`###` sections and em-dashes, `howto.md` has a `#` heading in the body. Take
rhythm, tone, and structure from them, never their heading levels or dashes.