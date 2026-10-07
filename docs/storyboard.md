# QPS at 30: Storyboard (Mode 1, ~5:00)

Working title: **Echoes**. A 1996 AI thesis, and the chain of innovations that connects it to 2026.

Source: `source/thesis-1996-scan.pdf` (page refs below are PDF pages; thesis page = PDF page − 7).

## Editorial stance

Matter of fact. Record the state of the art in 1996, then explain the path to the present. Plain captions, no jokes, no hype. Where an analogy is imperfect, say so plainly.

## Scene template

Each scene has four beats and one signature device, the **Connections chain** (after James Burke): a chain of 3–4 dated innovations, each causing the next, that links the 1996 technique to its 2026 descendant.

| Beat | ~Time | What happens |
|---|---|---|
| **BRIDGE** | 3.5s | A first-person lead-in that says why this scene matters, like the supervisor's challenge in the cold open. The scene fades up from black into it, so no cut is abrupt. |
| **PROBLEM** | 4.5s | Bold type states the problem and why it is hard. |
| **1996** | 11s | Wireframe depiction of how the program solved it, in the discrete, hard-edged register, in signal blue. |
| **CHAIN** | 9s | Opens with one line on why the innovations matter ("In the 30 years since, a series of breakthroughs led to the thinking machines we use every day."), then dated nodes, each saying **why it mattered**, with the 1996 frame softening into the 2026 frame behind. The accent shifts from blue to orange as the nodes arrive. |
| **2026** | 8.5s | How it is solved now, from a real recorded transcript, in the 2026 register: **orange accent**. Ends on a plain **ECHO** or **DIFFERS** note. |

Scene length is 36.5s; with the 41s cold open and a 25s outro the film runs about 5:20.

Visual grammar: 1996 is crisp lines, nodes and integer steps in signal blue. 2026 is the present, in orange. The chain is the transition: a calm blur-crossfade between the two frames (the earlier burning-edge dissolve was removed), with the accent colour shifting through it.

ECHO means a close analogue. DIFFERS means where the analogy breaks. Wording is flat and factual, e.g. "ECHO: same job, learned instead of hand-written."

## Cold open (0:00–0:41)

Personal framing, then a concrete scientific problem, then the machine's reasoning as a chain of plain-language questions. No jargon: the program's name is never shown, and the viewer is told why each step is needed.

**A. The challenge (0:00–0:08).** Caption **SEPTEMBER 1993.** Then, in first person: "My PhD supervisor, Professor Jack Smith, set me a challenge: build intelligent software that was better at solving scientific problems than I was." The words clear away at the end.

**Bridge (0:08.6–0:12).** The screen becomes a vector raindrop (a teardrop) with a diameter bar ("1 mm") and a downward arrow ending in a big **?**, labelled "A SCIENTIFIC PROBLEM". The prompt (thesis p.9) types beside it: *"Calculate the force due to gravity acting on a raindrop, 1 millimetre in diameter."* It then shrinks to a caption.

**B. The chain of questions (0:12–0:30).** One slam per beat, full sentences. A wireframe of the search tree grows behind and the camera flies through it, kept to the left; the drawing on the right annotates itself as things become known.

| # | Question (bone) | Answer (blue) | Drawing |
|---|---|---|---|
| 1 | What is force? | F = m g. Mass times gravity. | |
| 2 | Gravity? We know that. | g = 9.81 | g appears by the arrow |
| 3 | But what is its mass? | m = ρ V. Density times volume. | "m = ?" appears |
| 4 | Density of what? | Raindrops are water. 1000 kg/m³ | |
| 5 | But what is its volume? | It's a sphere. V = 4/3 π r³ | the teardrop rounds into a circle |
| 6 | But that requires knowing its radius. | We know its diameter. Just halve it. r = d / 2 | the right half of the bar lights up |
| 7 | And the diameter? | 1 mm. You told me. | d = 1 mm lights up |

**The tree carries the facts.** Each node shows its property name, its value and where the value came from, filled in as it is found: **gravity** 9.81 m/s² (a constant), **density** 1000 kg/m³ (property of water), **diameter** 1 mm (given in the question), then **radius** 0.5 mm (half the diameter), **volume** 5.2 × 10⁻¹⁰ m³ (sphere formula), **mass** 5.2 × 10⁻⁷ kg (density × volume), **force** 5.1 × 10⁻⁶ N (mass × gravity). Unsolved nodes show a blue **?**. The actual numbers matter less than making clear where each value comes from, so there is no giant answer slam.

**Payoff (0:30–0:34).** "Now work back up." Each rule is stated in plain language as its value fills in (radius = half the diameter; volume = 4/3 π r³; mass = density × volume; force = mass × gravity), and the line settles on: **Every value traced back to its source.** The drawing's arrow turns blue.

**Pull-back (0:34–0:37).** The camera pulls back to show the whole tree: "GOAL-DIRECTED SEARCH · 1996. Each question was a node in a search tree."

**C. Title card (0:37–0:41).** **How I got machines to think** with **(in 1996)** in blue beneath, and a small line: "A PhD thesis in artificial intelligence, thirty years on."

Removed from earlier drafts: the Whitman epigraph (it added nothing) and every on-screen mention of "QPS" (nobody knows what it means). The thesis's own name for its system stays in documentation only.

Optional personal detail for the opening or outro: the Sinclair Spectrum bought in 1983 (p.3).

## Scenes (~33.5s each, 0:41–4:35)

### 1. Understanding the question
- **Bridge:** "In 1996, it was extremely difficult for machines to understand natural language. We interacted through user interfaces to compensate." (Thesis p.91: "in the absence of a natural language interface".) No separate Problem beat: the bridge already says it.
- **1996: entity extraction, by hand.** The English question is typed, the key entities are marked (material, geometry, known quantities, goal) and snap into the fields of a fixed form, "the user interface" (p.91).
- **Chain:** word embeddings (2013) → the Transformer (2017) → few-shot prompting (2020) → instruction tuning (2022), opened with "In the 30 years since, a series of breakthroughs led to the thinking machines we use every day." Each node says why it mattered. The old screen goes fully black before the text appears, and the accent runs from blue (2013) to orange (2022).
- **2026: how we talk to machines now (orange).** "Now we've been speaking to machines naturally for years." Then the same sentence read by a modern model, at a very high level: (1) broken into pieces, (2) each piece turned into numbers that capture meaning, (3) attention links the words that relate (copper–bar, 5 centimetres–radius, critical–load…), (4) a reply written one word at a time, shown as three verbatim lines from a recorded Claude run. Stages 1–3 are a labelled, simplified illustration (the attention links are authored, not extracted from a model); Raindrop will replace them with real internals.
- **Note:** ECHO. The fixed form my program required is gone: the model reads the sentence itself.

### 2. Finding the right knowledge (first cut built)
- **Bridge:** "My program knew 122 formulae. Checking whether one fits is easy. Knowing which to try is the hard part." (p.154: 122 formulae.)
- **1996 (15 s), on the thesis's helium example (Example 4).** (1) A field of 122 formula cards; the goal, the mass *m*, lights the cards that contain it, exactly, by symbol (p.84, step 1). (2) Each formula needs more quantities, so the choices multiply: 3 → 9 → 27 … and the counter jumps to 3²⁰ = 3,486,784,401 for 20 levels (p.92: some mass searches are ~20 levels deep; three choices per step is an illustration). (3) A light-touch card, "Easy to check. Hard to find.", naming the shape: P versus NP, unproven, most researchers believe finding is harder; hindsight, not in the thesis. (4) The hand-written rule that made it workable: try the formula with the fewest unknowns first (p.82); the tree prunes. "A heuristic doesn't change the worst case. It makes the typical case fast."
- **Chain:** "Finding is still hard. The shortcuts are now learned from data, not written by hand." Attention (2014) → dense retrieval (2020) → retrieval-augmented generation (2020). Dates unverified.
- **2026 (12 s, orange):** "Now we don't tell it where to look. We just ask." Knowledge as a cloud of points; similar meanings sit close together; the question becomes a point; its nearest points light up and name what the real reply then uses (ideal gas law, molar mass of helium, volume of a cylinder); three verbatim lines from a recorded Claude run. A labelled, simplified illustration.
- **Note:** DIFFERS. Nothing here solves P versus NP. A model finds by learned intuition, not by guarantee: usually right, never certain.

### 3. Backtracking from failure (first cut built)
- **Bridge (8 s):** "In my system, scientific formulae were the rules for problem solving. But the route to the answer may hit dead ends, so it was essential the solver could detect potential failures and backtrack from them." (p.82: backtracking "retraces its steps to its most recent choice".)
- **1996 (15 s), on the helium example again (Fig 5.4, thesis p.86–87, redrawn and simplified).** A cursor walks the search tree. F = m g needs the force; the only formula for force, F = m a, needs the mass: the goal has come back, a loop, so the path is abandoned (p.86 note 1). The cursor backs up to its last choice. m = M n works for the molar mass, but one way to get the moles needs a count of molecules that nothing supplies: a dead end. It backs up again; the gas law succeeds. Failed branches fade; only the path that worked stays lit ("the user will not be interested in the search paths that failed", p.105). Captions say each step in full sentences. The thesis's Fig 5.5 (premature rejection) is left out on purpose.
- **Chain:** Monte Carlo tree search (2006) → AlphaGo (2016) → chain-of-thought prompting (2022) → reasoning models (2024). Dates and attributions unverified.
- **2026 (12 s, orange):** "Now a model can do the same: try something, notice it's wrong, and go back." Four verbatim excerpts, in order, from the recorded run shown in scene 1 (`s03-dead-ends.json` is the same run without the trim): the claim (1.5 MN), the model's own working that disagrees, "I made an arithmetic slip above…", the corrected answer (2.5 MN). The first line is struck out and a curve backs up to it, like the cursor. Labelled as an arithmetic slip fixed in its own words, not a change of approach.
- **Note:** ECHO. Same move: try, notice a dead end, go back. Then by rules I wrote; now learned from practice.

### 4. Knowing what to hand off
- **Problem:** Reasoning and calculating are different jobs, and some problems break the main loop.
- **1996:** The Solver decides, the Interpreter computes (p.100). Symbolic rearrangement fails, so InverseInterpreter runs bisection. Example 6 stalls on the F꜀ ↔ Eₜ cycle, so SimSolver takes over (p.101–103), then IntegralSolver. Results return and the search resumes.
- **Chain:** ReAct (2022) → Toolformer (2023) → function calling in model APIs (2023) → Model Context Protocol (2024).
- **2026:** Tool calling. The model emits a call, a calculator or code interpreter returns a value, reasoning resumes.
- **Note:** ECHO. DIFFERS: depth-first search handles one goal at a time, attention weighs everything at once. Interdependent goals are where QPS broke.

### 5. Admitting uncertainty
- **Problem:** Real data is never exact. Floating-point numbers pretend it is.
- **1996:** Triangular fuzzy numbers carried through every calculation (Ch. 6), widening as they propagate. Brief nod to the Shorts stress problems (Ch. 7).
- **Chain:** Bayesian networks (Pearl, 1988, the era QPS lived in) → Monte Carlo dropout (2016) → calibration of neural networks (2017) → language models that estimate their own correctness (2022).
- **2026:** Probability distributions over outputs, calibrated confidence.
- **Note:** ECHO, loosely. Fuzzy membership is not probability, and the thesis says so (§6.3.2).

### 6. Showing your work
- **Problem:** An answer nobody can check is not trusted.
- **1996:** ReportMaker lists the formulae in order with the source of every value (Fig 5.8). FailureReporter says why it failed and what to supply next (p.113–114).
- **Chain:** LIME (2016) → SHAP (2017) → chain-of-thought as visible reasoning (2022) → mechanistic interpretability of language models (2020s).
- **2026:** A reasoning trace with cited steps, or the model asking a clarifying question.
- **Note:** ECHO. DIFFERS: a trace may not be the real reason for the answer (faithfulness). The Raindrop project goes after this directly.

### 7. The bottleneck
- **Problem:** Everything above works only if someone typed in the knowledge.
- **1996:** The knowledge base as a hand-entered list. A stress-engineering KB "would be a major endeavour" (p.181).
- **Chain:** Wikipedia (2001) → Google Knowledge Graph (2012) → neural scaling laws (2020) → large language models trained on text.
- **2026:** The knowledge is learned from text. The same raindrop question typed in English and answered.
- **Note:** DIFFERS. A model has no guarantee the formula is right, and QPS did.

## Outro (4:35–5:00)

Callback to the opening challenge: build software better at solving scientific problems than I was. In 2026 the answer is, on many problems, yes. State it plainly, with the caveat from scene 7.

Then the closing line from p.181: *"Perhaps one day people will run an automatic problem solver instead of reaching for a calculator."* End on the Whitman epigraph and "30 years".

## Decisions

- **Pacing:** seven scenes at ~35s each. Pacing can be tweaked later.
- **2026 visuals:** real recorded model transcripts, rendered as motion graphics. This is a placeholder: the author's separate **Raindrop** project will visualise model internals, and those visuals replace the transcripts when ready. So the 2026 beat is a swappable slot (transcript renderer now, Raindrop visualisation later).
- **Sound:** subtle sound effects, no music or voiceover. Cues tied to scene events (node lock, branch fail, tool call, chain step). Needs a mute control and must respect browser autoplay rules.
- **Tone:** matter of fact. Connections-style chains explain the path from 1996 to the present.
- **Framing:** first person and personal, opening with the September 1993 challenge.

## Open questions

- **Chain accuracy:** every year and attribution in the chains must be verified against primary sources before publishing. The drafts above are from memory.
- **Chain length:** 3–4 nodes in 9s is about 2–3s each. If that is too fast to read, trim to 3 nodes or lengthen the beat.
- **Mode 2 hooks:** each beat carries a thesis page reference so Mode 2 can open the source at that page. Chain nodes could link to the original papers.

## Next steps

1. Verify the chain dates and attributions.
2. Capture the 2026 transcripts, one per scene, from real model runs.
3. Write the technical spec: timeline engine, scene data format, chain component, 2026 slot interface, audio cue system.
4. Scaffold the `/thesis` route and build the cold open plus scene 1 as a vertical slice.
