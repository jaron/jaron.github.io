# QPS at 30: Design and pipeline notes

Companion to [storyboard.md](storyboard.md).

## Aesthetic reference: pdoom-video

Reference: https://github.com/mexicat/pdoom-video (MIT, Copyright (c) 2026 Giacomo Magnanini; fonts are SIL OFL). Credit it wherever its code or style bible is reused.

What it is: a code-rendered video where every frame is a deterministic pure function of time `t`, previewed live in the browser and exported offline at 1080p60 or 4K60. TypeScript + three.js, bun + Vite, Playwright-driven headless Chrome piped to ffmpeg. Style bible: `docs/TREATMENT.md`. Engine guide: `docs/ENGINE.md`.

What we take from it:

- **Concept fit.** The treatment frames the video as *plates from an illustrated treatise*. Our film is a thesis, so each scene is a **Figure** (the thesis numbers its figures, e.g. "Figure 5.4") redrawn in engraving style.
- **Palette.** ink `#0A0A0B`, ink2 `#151517`, graphite `#5E5B57`, ash `#9C978F`, bone `#EEE9DF`, one hazard "signal" colour for the single moving subject. Rare accent colour owned by one moment. Some plates invert to bone paper with ink lines for light/dark rhythm. Only the signal colour may glow.
- **Type.** Archivo (width 62–125, weight 300–900) for the bold voice, IBM Plex Mono for the machine voice, Cormorant Garamond italic rarely. Kerned glyph by glyph, typographic punctuation, no outlined or haloed type. Single-stroke plotter fonts for text that is "written".
- **Imagery.** Hairline engraving hatching, GPU line batches, wireframe geometry, bloom only on the signal colour, halation, film grain. Hard cuts on beats, strong eases (`outExpo`, springs), holds then snaps.
- **Engine rules.** Scenes are pure functions of `f.t` with seeded randomness, never `Math.random()` or `Date.now()`. Logical 1920×1080 layout with true 4K via `scale=2`. Adaptive sub-frame sampling for motion blur in export.
- **Anti-slop list.** No purple/cyan neon, no glowing brains, no code rain, no stock "AI" imagery, no emoji.

What differs for us:

- **No song.** Timing is authored in seconds against our own cue grid, not derived from lyric alignment. Sound is subtle effects cued from the timeline.
- **Runs on visitors' devices.** pdoom's live preview wants a recent Mac. We need a performance budget, quality tiers (bloom, halation, sample count) and a prerendered MP4 fallback for weak devices.
- **Interactive Mode 2.** The film must expose scene state (what is on screen, which thesis page it cites) so exploring can branch out of the flow.
- **1996 vs 2026 registers.** 1996: bone/graphite hairline engraving, discrete, integer steps. 2026: the same geometry gone soft, with the signal colour doing the glowing.

## Decisions pending

1. **Engine reuse:** fork the pdoom-video engine (`app/src/engine`: timeline, post, type, line batches) with attribution, or rebuild a leaner engine to our spec. Forking is faster and gets 4K export and the type system for free. A rebuild is lighter for the web.
2. **Signal colour:** keep hazard orange, or choose a different single colour so the film does not read as a sequel.

## Thesis PDF: regeneration pipeline

The scanned PDF (196 pages, no text layer, ~3.4 MB) is not good enough to publish. Plan: regenerate it with modern typography that holds up on a 4K screen. The same pipeline gives Mode 2 its source text.

Tool choice: **marker** (datalab-to/marker), not Nougat. Marker handles scans with OCR, headings, tables, LaTeX equations and figure extraction. Nougat was trained on arXiv-style LaTeX papers and is the weaker fit for a 1996 Word-typeset scan. Trial on 5 pages confirmed: clean text, correct heading levels, a real table, inline math (`$F = m a$`), figures extracted.

Setup (isolated, nothing global except two Homebrew installs):

- Python 3.11 venv via `uv` in the scratchpad, `marker-pdf` installed there (~1 GB).
- `brew install poppler tesseract llama.cpp` (poppler and tesseract were used for rendering and a first OCR pass; llama.cpp is marker's OCR backend).
- Full run: `marker_single thesis.pdf --output_format markdown --paginate_output`. About 30 s per page, so roughly 100 minutes.

Known problems to fix after the run:

- Figures are extracted as low-resolution, aliased rasters. They will look soft at 4K. **Redraw them as vector SVG**, starting with the search trees (Fig 5.3–5.6) that the film animates. One tree data file can then drive both the film scene and the typeset figure.
- OCR errors and duplicated list numbering ("1. 1)") need cleanup and a proofreading pass against the page images.
- The table of contents and cross-references should be regenerated from headings and figure numbers, not trusted from OCR.
- Page numbers: keep the original thesis page numbers as anchors so Mode 2 and the typeset edition can cite the original pagination.

Typesetting: Markdown → HTML (KaTeX for math, our fonts) → PDF via headless Chrome (already in the pdoom toolchain). The same HTML is the Mode 2 reader. It must be presented as a re-typeset edition of the 1996 thesis, with the original scan kept in the repo's source material but not published.

### Finding: the appendices are not in this PDF (by design)

Pages 193–196 of the PDF are only the appendix index (A–C), a caption for the class diagram, and a blank page. The author confirms the appendices were not part of the PDF they generated from Word: they were solver output traces, some of which the author redrew as diagrams. So the QPS solution reports (for example "Example 1: Weight of a Raindrop") are not in the source we have. Consequences: the film computes the raindrop answer from the thesis's own chain, and scene 1 uses Example 3's input specification from p.91 (quoted verbatim). If the original Word file or the redrawn diagrams survive, they are better source material than the scan.
