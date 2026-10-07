# QPS at 30: Roadmap

Status as of 2026-10-05. Detail lives in [spec.md](spec.md) (film), [storyboard.md](storyboard.md) (content) and [design.md](design.md) (look and PDF pipeline).

## Done

- Storyboard: seven scenes (Problem → 1996 → Connections chain → 2026), cold open, outro.
- Engine forked from pdoom-video (MIT, credited), palette swapped to the site's `#007AFF`.
- M2 framework: figure-scene template, Problem beat, Chain + dissolve morph, ECHO/DIFFERS note, 2026 transcript slot, synthesized sound cues, controller, content schema, content checker. Determinism verified in-page.
- Scene 1 (understanding the question), restructured: bridge, entity extraction, Connections with an opening line and per-node significance, and a 2026 half that shows how a model reads language (tokens, numbers, attention, a real reply) in orange.
- Scene 2 (finding the right knowledge, with a light touch of P versus NP): first cut built, with a real recorded helium transcript.
- Scene 7 (where knowledge comes from): first cut built. The 1996 knowledge base typed in entry by entry (142 + 122 + 110 + 21), the scene 6 formula ringed, the thesis's "major endeavour" quote; a real recorded raindrop reply in 2026 beside GPT-3's published training mix. All seven scenes now have a first cut; the outro is next.
- Scene 6 (showing our work): first cut built. The thesis's Explain window redrawn for the copper bar, with the program's real wrong answer (π instead of π²) corrected on screen; a real recorded reply with a sourced table in 2026.
- Scene 5 (knowing how sure we are): first cut built. The raindrop replayed with triangular uncertainty widening through each step; a real recorded model reply gives its own range.
- Scene 4 (tool calling): first cut built. A Solver-and-specialists hand-off diagram (sum, real bisection, linked equations) and a real recorded tool call in 2026. The capture script now records tool runs.
- Viewer progress bar (`src/film/ui/progress.ts`): one segment per section ("The challenge", then each scene, proportional to length), a label for where you are, play/pause, click a segment to jump to that scene's start, drag to scrub; fades to a hairline while playing and returns on movement or pause; orange during a scene's 2026 half.
- Scene 3 (backtracking from failure): first cut built. A redrawn Fig 5.4 search tree with a walking cursor; 2026 shows the real self-correction from scene 1's recorded run.
- Determinism verified in clean headless Chrome (`npm run check:determinism`); very large type is drawn from outlines (`fillBigText`).
- The film now opens on its title card; the dated challenge follows. Cold open is 39 s.
- Cold open (40 s) first pass: `src/film/scenes/cold-open.ts`, data in `src/film/data/cold-open.ts` and `data/figures/raindrop.json`; its quotes are verified against the thesis text.
- Thesis text extracted (marker, 196 pages) and used for page-accurate quote checking.
- **Re-typeset 2026 edition PDF** (192 pages): `source/thesis-2026-edition.pdf`, built by `edition/build.mjs`.

## Outro: candidate predictions (Jaron is deciding)

Verbatim from the thesis, with the verdict against scenes 1–7. **Right:** agents ("several domain experts… all controlled by the problem solver", p.163); linking to third-party tools (p.165); formulae chosen by past success, i.e. learned shortcuts (p.162); default values for implicit facts like temperature (p.162); explanations "tailored to the inexperience, expertise or scepticism of the reader" (p.164); education as the first application (p.164); AI to "solve problems autonomously" (p.165); "instead of reaching for a calculator" (p.174). **Different:** the stress-engineering knowledge base "would be a major endeavour" (p.174; it was absorbed from text instead); knowledge bases growing in size (p.174; scale mattered, but learned); component frameworks "hailed as the solution to bloated software" (p.158; OpenDoc was cancelled in 1997, to verify); a Java-enabled browser client (p.161; the browser won, Java applets did not); partitioning knowledge by domain (p.162; one network holds it all); uncertainty as lower/best/upper ranges (p.130; models state ranges in words). Pages are thesis page numbers.

## Next: the film

| # | Item | Notes |
|---|---|---|
| M3 | ~~Real cold open (40 s)~~ **revised after review**: challenge, bridge to a vector raindrop with measurement bars, a self-annotating drawing, full-sentence questions over a 3D tree, collapse to 5.1 µN, pull-back, title card (no Whitman, no "QPS"). Values and provenance now live in the tree nodes (no giant number). Sound button redesigned and verified to fire. Still to do: listen to the sound (not possible from the build environment), confirm the title-card wording, Greek letters (ρ) fall back to a serif in Archivo | Storyboard section "Cold open" |
| M3 | Finish scene 1: soften the 2026 register (glow, heat), verify the four chain dates | Chain facts are unverified |
| M4 | Scenes 2–7 | Each needs a 1996 renderer, data, chain, transcript, cues. Scene 3 uses the saved self-correcting transcript |
| M5 | Outro, quality tiers, accessibility, YouTube embed fallback | |
| M6 | Export pipeline (4K), reduced-grain upload master, YouTube upload (author) | |
| | Wire `check:content --strict` into CI before the film is linked publicly | Currently warns only |

## Next: the edition (PDF and web)

- **Proofreading pass.** Compare every page of the typeset text with the scan, log each fix in `edition/corrections.json`, then remove the "not yet proofread" notice. Priority: equations, symbols, tables, bibliography entries.
- **Vector figures.** Redraw the raster figures as SVG, starting with the search trees (Fig 5.3–5.6). One tree data file can drive both the film scenes and the printed figures.
- **HTML edition.** Publish the same text as a crawlable, searchable web version (anchors on the original page numbers, equations as real math). Best route to being found and quoted.
- **Original sources, if they turn up.** The Word file or the author's redrawn diagrams would beat the scan on every front. The appendices (solver output traces) were never in the PDF.

## Later: the bibliography as a knowledge graph

The thesis bibliography is a closed, keyed set of 130 sources from the early-web era, and in-text citations use the same keys (`[Rich91]`, `[Krishnamurthy94]`). Many sources and URLs have since vanished, so it is a record of the state of the art in 1996 that is not easy to find elsewhere.

Ideas, roughly in order:

1. **Extract structured data.** One record per entry: key, title, authors, venue or publisher, year, any URL. The build already splits entries into key / title / meta (`edition/build.mjs`); export that as JSON. Proofread names and titles first, since a misread name makes a source unfindable.
2. **Link citations to the text.** Find every in-text `[Key]` and record the chapter, section and original page that cites it. That gives the citation graph: which ideas the thesis drew on, and where.
3. **Resolve to the present.** For each source, find a DOI, a publisher page or an archived copy (Internet Archive), and record a status (live, archived only, lost). Flag the dead early-web URLs (for example `zebu.uoregon.edu`) with their archive links.
4. **Show it.** Build an interactive graph (sources, themes such as expert systems, qualitative physics, fuzzy logic, object-oriented design) and use it in Mode 2, so a viewer can step out of the film and follow a source back to the passage that cites it.
5. **Connect to the film.** Several sources are the "state of the art" the film refers to (for example Rich, Luger, Bundy, MYCIN). The chain nodes could link back to them.
6. **Publish the data** with the HTML edition, under a clear licence, so others can reuse it.

Open questions: scope of "resolve to the present" (all 130, or the most-cited), and how to record uncertainty when a match is a guess.

## Later: Mode 2

Interactive exploration that branches out of the film (spec section 9 defines the hooks): thesis reader at the cited page, the bibliography graph, the figures as live diagrams, Raindrop visualisations in the 2026 slot when that project is ready.

## Open decisions

- Whether to wire a Raindrop renderer into the 2026 slot or ship with transcripts.
- Video: YouTube upload and ID once the 4K master exists.
- Licence for the edition text and the bibliography data.
