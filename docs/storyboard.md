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
| **CHAIN** | 11s | Opens with one line on why the innovations matter ("In the 30 years since, a series of breakthroughs led to the thinking machines we use every day."), then dated nodes, each saying **why it mattered**, with the 1996 frame softening into the 2026 frame behind. The accent shifts from blue to orange as the nodes arrive. |
| **2026** | 8.5s | How it is solved now, from a real recorded transcript, in the 2026 register: **orange accent**. Ends on a plain note under a **1996 vs 2026** headline (so it reads as a comparison, not part of the answer above it). |

Scene length is now about 40–50s (each beat is set per scene in its content file); with the 41s cold open and a 25s outro the film runs about 5:20.

**Chain linger.** The finished chain (every node fully shown) stays for 2 seconds before the screen fades, so the nodes can be read; `check:content` fails a chain beat too short for its nodes (2 s linger plus 1.4 s per node).

**Linger rule.** The note appears at `note.at` seconds into the 2026 beat (data, per scene) and the scene then holds for 5 seconds before advancing, so viewers can read the finished screen and take a breath. `npm run check:content` fails any scene whose 2026 beat is shorter than `note.at` + 0.5 s fade + 5 s.

Visual grammar: 1996 is crisp lines, nodes and integer steps in signal blue. 2026 is the present, in orange. The chain is the transition: a calm blur-crossfade between the two frames (the earlier burning-edge dissolve was removed), with the accent colour shifting through it.

ECHO means a close analogue; the viewer sees it as **A SIMILAR IDEA**. DIFFERS means where the analogy breaks; the viewer sees **DONE DIFFERENTLY NOW**. (The data keeps the short keys.) Wording is flat and factual, e.g. "ECHO: same job, learned instead of hand-written."

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

### 4. Tool calling (first cut built)
- **Bridge (6.5 s):** "Reasoning and calculating are different jobs. My solver decided what to find. Specialist programs did the sums, and it carried on with their answers." (p.91: formula evaluation and the rest "were delegated to other objects".) The title uses the modern term because viewers understand it.
- **1996 (18 s).** The Solver (left, with its tree of needs) hands each calculation to a specialist (right); a packet carries the formula over, the specialist works, the answer comes back into the tree. Three hand-offs of rising difficulty: (1) the Interpreter works out a sum (p.93); (2) a formula that can't be rearranged goes to a specialist that tries values and narrows in by halving, drawn as the real bisection on x = 2 cos x, "thousands of tries in practice" (p.93); (3) unknowns that depend on each other send the search in circles (scene 3's loop), so both formulae go to the simultaneous-equation specialist, which settles both values together (p.95–96). Integrals are only named (p.104). The equations are labelled illustrations. The thesis's printed answers for Examples 7 and 8 are not used: Example 7's problem says 1.0 m but its printed answers only fit 1.1 m.
- **Chain:** ReAct (2022) → Toolformer (2023) → function calling in model APIs (2023) → Model Context Protocol (2024). Dates and attributions unverified.
- **2026 (14 s, orange):** "Now a model decides for itself when to ask a tool." A real recorded run (`s04-tool-calling.json`; `npm run capture:transcript` now records tool runs: one tool, Bash restricted to python3, call and result kept as turns). The model was asked to solve x = 2 cos(x); it chose to call Python, wrote Newton's method, got 1.0298665293 back, and replied. Shown in order: its code, the value returned, its reply. The footnote says the model was told a Python tool was available and the code is its own.
- **Note:** ECHO. Same split. I wired in each specialist; now the model chooses when to call a tool.
- **Saved for the outro:** the thesis's own agents idea (p.163: domain experts "controlled by the problem solver").

### 5. Knowing how sure we are (first cut built)
- **Bridge (6.5 s):** "Every measurement is a little wrong. A single number pretends otherwise. So my program carried each number's uncertainty through every step." (p.109: "Almost all numerical scientific data is subject to error".)
- **1996 (19 s), the film's own raindrop again.** Each value is a triangle: a best guess with a lower and an upper bound (the thesis's triangular fuzzy number, p.130), drawn on a common ±20% axis. Rows follow the cold open's tree: diameter, radius, volume, mass, force. The thesis's own arithmetic carries all three values through each rule, so the range widens: ±5% on the diameter becomes about −14% / +16% on the force, because the radius is cubed. Output: 5.1 µN, between 4.4 and 5.9. A funnel from the diameter's bounds down to the force's bounds makes the widening visible. The ±0.05 mm measurement error is an assumption for illustration, and the screen says so. Why a range and not a probability: probability needs at least 200 measurements (p.119); an engineer with one ruler has one. The scene's closing line is the Russell epigraph from the head of the thesis's chapter 6 (p.108), attributed to Russell alone, which appears once the old screen has fully faded once the old screen has fully faded.
- **Chain:** Bayesian networks (Pearl, 1988) → Monte Carlo dropout (2016) → calibration of neural networks (2017) → language models that estimate their own correctness (2022). Dates and attributions unverified.
- **2026 (13 s, orange):** a real recorded reply (`s05-uncertainty.json`) to the film's raindrop question with an added request: "Give your best estimate and a range showing how uncertain it is." Excerpts, in order: the cube law ("Force scales as d³"), the range for a diameter of 0.95 to 1.05 mm (4.4 to 5.9 × 10⁻⁶ N, the same as the 1996 illustration), its best estimate (5.1 µN), and its own plausible range (4 to 7 × 10⁻⁶ N). Both ranges are drawn as triangles. The footnote says the model was asked for a range.
- **Note:** ECHO. Same cube law, same range, and no one gave it the rule. Its confidence is learned, so it can be wrong.
- Not used: the thesis's rule that turns an exact "14" into "14 ± 0.2" (it contradicts its own description), and any numbers from Chapter 7 (it prints no uncertain outputs).

### 6. Showing our work (first cut built)
- **Bridge (7 s):** "An answer nobody can check is not trusted. So my program wrote out its working: every formula, and where every value came from." (p.105: "The user will expect to see how the answer was derived".)
- **1996 (27 s), the copper bar of scene 1, redrawn from the thesis's Explain window (Fig 5.8, p.105–106).** The answer first, then the explanation: each formula in the order it was used, with every value tagged given, from the knowledge base, or worked out above. The first answer is the program's real one, **8.23 × 10⁵ N**, computed from the formula as the thesis prints it (p.84): P = π E I / l². Then "Thirty years later, the working lets me check it": the π is ringed, Euler's formula has π squared, the missing square appears on screen, the old value is struck out and the answer is recomputed with the same values: **2.58 × 10⁶ N**. "An answer can be wrong. Without the working, how would we ever know?" The beat ends on an illustrated failure report (p.106–107): not solved, not enough known quantities, supply: temperature (the resistivity example in the thesis). All numbers on screen are computed from the data, using the report's own 3-figure value of I.
- **Chain:** LIME (2016) → SHAP (2017) → Scratchpads (2021, "Show Your Work") → mechanistic interpretability (2024). Dates and attributions unverified.
- **2026 (15.9 s, orange):** a real recorded reply (`s06-showing-our-work.json`) to the copper-bar question with the added request "Show your working, and say where each value comes from." It drew a table of quantities with their sources: given (radius, length), looked up (Young's modulus, a handbook value), **assumed** (end condition: pinned, "since the question doesn't specify"), worked out (I), used π² and got 2.5 MN, in line with the corrected 1996 figure. The film draws the table row by row with the same plain-word tags as the 1996 key, and shows the model's own answer line.
- **Note:** DIFFERS. My report recorded what the program did. A model's explanation is more text, and may not be what happened inside it (faithfulness: the Raindrop project goes after this).
- **Honest detail:** the formula in the program's knowledge base was missing a square (Jaron's reading: a ^2 left out when it was entered). The thesis's own printed answer reflects it.

### 7. The bottleneck
- **Problem:** Everything above works only if someone typed in the knowledge.
- **1996:** The knowledge base as a hand-entered list. A stress-engineering KB "would be a major endeavour" (p.181).
- **Chain:** Wikipedia (2001) → Google Knowledge Graph (2012) → neural scaling laws (2020) → large language models trained on text.
- **2026:** The knowledge is learned from text. The same raindrop question typed in English and answered.
- **Note:** DIFFERS. A model has no guarantee the formula is right. Neither did QPS: it applied whatever formula was typed in, as scene 6 showed. (Revise before building this scene.)

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
