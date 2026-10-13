# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| find-my-ev (homepage, quiz, results) | Instrument panel (new: chapters are live readouts computed from real data; bans scrub, kinetic, scrims except over the peak photo, invented figures) | Existing multi-page site header kept; no scroll chrome | Pinned layered dial: far rings, mid rings, foreground bezel scaling apart, headline recedes into a second line | parallax-pin > count flow > bespoke radar pin > reveal-fill flow > pan rail > flow input; 6 acts, ~11.4vh (12.3 on phones); site peak is a separate 2.8vh pin on /results | The first quiz question as a live input (budget tiles with real counts) handing over to question 2 | One range radar of all 471 cars across three pages: scroll sweep lights it, quiz answers switch dots off, results zoom into the No. 1 point and iris it open into the car photo | Dark ink instrument grounds + paper, number-plate yellow, Archivo; no generated assets | Next.js app, port 3000 |


---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- Instrument-panel grammar, the cross-page data radar, and "first form question as the close" are taken by find-my-ev.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.
