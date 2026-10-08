# jaroncollis.com

Source for [Jaron Collis](https://jaroncollis.com)'s personal site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

The repository also holds a work in progress: **a motion-graphics film about the author's 1996 PhD thesis** (a symbolic-AI problem solver), traced forward to how machines think today. It lives at `/thesis` (not linked from the site, `noindex`, and excluded from the sitemap) until it is finished.

## Commands

Run from the repository root. CI builds with Node 22.

| Command | Action |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` (open `/thesis?debug` for the film with its scrubber) |
| `npm run build` | Build the site to `./dist/` |
| `npm run preview` | Serve the build locally |
| `npm run check:content` | Validate the film's content data: quotes against the thesis text, chain dates, transcripts (`-- --strict` before publishing) |
| `npm run check:determinism` | Check that every film frame is a pure function of time (needs `npm run dev` and Chrome) |
| `npm run report:pacing` | Measure when every screen finishes drawing and how long it then holds; writes `docs/pacing.md` (needs `npm run dev` and Chrome) |
| `npm run render:audio` | Render the film's sound offline to `sound-check/` (git-ignored) and measure loudness and peaks (needs `npm run dev` and Chrome) |
| `npm run capture:transcript -- <scene-id>` | Record a real model reply, or a tool-using run, for a scene's 2026 half (needs a logged-in `claude` CLI) |

Pushes to `main` build and deploy through `.github/workflows/deploy.yml`.

## Layout

```text
public/            static files: fonts, images, robots.txt, profile and discovery files
src/pages/         index.astro (the site) and thesis.astro (the film page)
src/components/    shared Astro components
src/film/          the film: engine, scene template, scenes, content data (see docs/spec.md)
scripts/           content checker, transcript capture, determinism test
docs/              storyboard, technical spec, design notes and roadmap for the film
edition/           builds a re-typeset PDF of the thesis (see docs/design.md)
```

## The thesis film

- **What it says:** [docs/storyboard.md](docs/storyboard.md). A cold open, seven scenes (each pairs a 1996 technique with a chain of dated innovations leading to its 2026 descendant), and an outro.
- **How it works:** [docs/spec.md](docs/spec.md). Every frame is a pure function of film time, content is data kept apart from animation code, and the 2026 half of each scene is a swappable slot (recorded model transcripts now, model-internals visualisations later).
- **Sound:** off until the viewer turns it on. Every sound effect and the drone under the film are synthesized in the browser (`src/film/audio/`): no samples, a shared reverb, one musical scale, and a 1996 and a 2026 timbre. The only recorded sound is the outro's music (`public/audio/outro-music.mp3`), which plays only with sound on.
- **Look and the PDF pipeline:** [docs/design.md](docs/design.md).
- **Where it is up to:** [docs/roadmap.md](docs/roadmap.md).

Not in the repository, on purpose: the 1996 scan, figures extracted from it, the unproofread re-typeset edition, and the machine-converted thesis text (`source/` and `src/film/data/thesis-text/`). The content checker warns, but still runs, without them.

## Credits

The film engine is forked from pdoom-video (MIT, Giacomo Magnanini); see `src/film/LICENSE-pdoom-video`.

The outro's music was made with Gemini Music to the author's brief and is released with the rest of the repository.
