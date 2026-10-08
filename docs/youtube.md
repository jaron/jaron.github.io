# YouTube upload text

For `exports/film-4k-master.mp4` (7:47, 4K 60 fps). Copy each block into the matching YouTube field.

**Check before publishing:** the interactive link (https://jaroncollis.com/thesis) only works once the site is deployed; if you upload first, leave that line out and add it when the page is live. YouTube's "altered or synthetic content" question is about realistic people, voices or events: this film has none, so "No" is accurate, but the music is AI-generated (credited in the description).

## Title (71 characters, limit 100)

How I Made a Machine Think (in 1996): an AI PhD thesis, thirty years on

## Description (3846 characters, limit 5,000)

```text
In 1993 my PhD supervisor set me a challenge: build intelligent software that was better at solving scientific problems than I was. This film shows how I did it in 1996, and how today's AI does the same things, thirty years on.

Seven ideas from my thesis each get a 1996 half (redrawn from the thesis itself) and a 2026 half (a real, recorded reply from a modern AI model), joined by a chain of the research that connects them. It ends with three predictions I made in 1996, and how they turned out.

CHAPTERS
0:00 The challenge
0:37 Understanding the question
1:19 Finding the right knowledge
2:05 Backtracking from failure
2:49 Tool calling
3:36 Knowing how sure we are
4:24 Showing our work
5:25 Where knowledge comes from
6:29 What I predicted in 1996
7:23 A parting thought

THE 2026 HALVES ARE REAL
Every model reply, tool call and number in the 2026 halves is a verbatim excerpt of a recorded run (the model and date are on screen). Nothing is mocked up. The 1996 halves use my thesis's own examples and quotations, with page numbers on screen.

HOW IT WAS MADE
Every frame is drawn by code (TypeScript, WebGL), so the film can be watched live in the browser or rendered, as here, at 4K 60 fps. I made it with Claude Code. The sound effects and drone are synthesised in code; the outro music was made with Gemini Music to my brief.

WATCH IT INTERACTIVELY
The same film, drawn live in your browser: https://jaroncollis.com/thesis

THE CONNECTIONS (the research chains between 1996 and now)
2013 Word embeddings (Mikolov, Chen, Corrado, Dean) arxiv.org/abs/1301.3781
2017 The Transformer (Vaswani et al.) arxiv.org/abs/1706.03762
2020 Few-shot prompting (Brown et al.) arxiv.org/abs/2005.14165
2022 Instruction tuning (Ouyang et al.) arxiv.org/abs/2203.02155
1998 PageRank (Brin and Page) research.google/pubs/the-anatomy-of-a-large-scale-hypertextual-web-search-engine/
2014 Attention (Bahdanau, Cho, Bengio) arxiv.org/abs/1409.0473
2020 Dense retrieval (Karpukhin et al.) arxiv.org/abs/2004.04906
2020 Retrieval-augmented generation (Lewis et al.) arxiv.org/abs/2005.11401
2006 Monte Carlo tree search, UCT (Kocsis, Szepesvári) link.springer.com/chapter/10.1007/11871842_29
2016 AlphaGo (Silver et al.) nature.com/articles/nature16961
2022 Chain-of-thought prompting (Wei et al.) arxiv.org/abs/2201.11903
2024 Reasoning models (OpenAI) openai.com/index/learning-to-reason-with-llms/
2022 ReAct (Yao et al.) arxiv.org/abs/2210.03629
2023 Toolformer (Schick et al.) arxiv.org/abs/2302.04761
2023 Function calling (OpenAI) openai.com/index/function-calling-and-other-api-updates/
2024 Model Context Protocol (Anthropic) anthropic.com/news/model-context-protocol
1988 Bayesian networks (Pearl) doi.org/10.1016/C2009-0-27609-4
2015 Monte Carlo dropout (Gal, Ghahramani) arxiv.org/abs/1506.02142
2017 Calibration (Guo et al.) arxiv.org/abs/1706.04599
2024 Semantic entropy (Farquhar, Kossen, Kuhn and Gal) doi.org/10.1038/s41586-024-07421-0
2016 LIME (Ribeiro, Singh, Guestrin) arxiv.org/abs/1602.04938
2017 SHAP (Lundberg, Lee) arxiv.org/abs/1705.07874
2021 Scratchpads (Nye et al.) arxiv.org/abs/2112.00114
2024 Mechanistic interpretability (Templeton et al.) transformer-circuits.pub/2024/scaling-monosemanticity/
2008 Common Crawl (Common Crawl Foundation) commoncrawl.org/
2018 Pretraining (Radford et al.) cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf
2020 Scaling laws (Kaplan et al.) arxiv.org/abs/2001.08361

ALSO IN THE FILM
Bertrand Russell on vagueness. Rich Sutton, "The Bitter Lesson" (2019). "Prediction is very difficult, especially if it's about the future": widely attributed to Niels Bohr, origin uncertain. GPT-3 training data: Brown et al., "Language Models are Few-Shot Learners" (2020), Table 2.2.

Jaron Collis · https://jaroncollis.com

#AI #PhD #MachineLearning #LLM #AIHistory
```

The chapter list needs its first entry at 0:00 and each chapter at least 10 seconds long, which these are. (The Bohr quotation, 6:29 to 6:34, is folded into "What I predicted in 1996".)

## Tags

AI, artificial intelligence, PhD thesis, history of AI, symbolic AI, expert systems, large language models, LLM, transformer, tool calling, chain of thought, uncertainty, explainable AI, interpretability, the bitter lesson, motion graphics, Jaron Collis, 1996

## Pinned comment

```text
This is the film version of my 1996 PhD thesis. Every 2026 half is a real recorded reply from a modern model, and every 1996 half comes from the thesis itself. You can also watch it drawn live in your browser: https://jaroncollis.com/thesis

Which of the seven connections surprised you most? And if you made a prediction about AI in 1996, what would it have been?
```

## Thumbnail

The title card from the film's first seconds ("How I made / a machine / think", with "(in 1996)") is the natural thumbnail: export a frame at about 0:02 from the 4K master, or at 1280×720 with `ffmpeg -ss 2 -i exports/film-4k-master.mp4 -frames:v 1 -vf scale=1280:720 thumb.png`.
