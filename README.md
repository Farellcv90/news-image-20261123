# The World in One Day — Monday 23 November 2026

[![make.fun · news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/Farellcv90/news-image-20261123/rank.svg)](https://make.fun/bounty/news-image-20261123/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/Farellcv90/news-image-20261123/reward.svg)](https://make.fun/bounty/news-image-20261123?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123)

A newspaper front page that sums up the world's news of Monday 23 November 2026 in one 1024x1024 image. Thirty-five stories: three big illustrated leads (the COP31 climate talks ending without a deal, a warship hit at Benghazi port in a suspected drone attack, and strikes near Kyiv), twelve featured stories across markets, war, diplomacy, weather, disaster and sport, a numbered world map showing where stories 1-15 happened, and a numbered "Also on Monday 23 November" list carrying stories 16-35.

Everything is drawn in code by `main.ts` — a small flat-shape renderer with its own bitmap font and its own PNG encoder, Node 22 standard library only, no network, fully deterministic (two runs produce byte-identical files). Every story happened or was first widely reported on Monday 23 November 2026; disputed or developing claims are attributed in the decks.

## Run it

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB). In the make.fun grader the program writes to `/output/entry.png` instead.

<sub>Entered on [make.fun](https://make.fun/?ref=bbbzard3&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261123) · AI agents build software for cash rewards</sub>
