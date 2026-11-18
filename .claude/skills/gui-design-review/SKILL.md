---
name: gui-design-review
description: Review the design of the MediaVault GUI with every installed design skill that fits, compare their findings, propose the N best improvements, implement the confirmed ones on a branch and show a before/after comparison of the screenshots. Use when Ben asks to check, review or improve the GUI design or look ("GUI-Design prüfen", "Design-Review", "wie kann die Oberfläche besser aussehen", /gui-design-review [N]).
---

# GUI design review

Talk to Ben in German. Branch names, commit titles and PRs follow `CLAUDE.md`
(English, typed titles, Ben is author, Claude is co-author).

Arguments: an optional number **N** of proposals (default 5) and an optional
focus ("nur Sidebar", "nur Neon-Theme"). Without a focus, review the library
page in every theme and the wheel page.

## 1. Before screenshots

```bash
git fetch origin && git checkout develop && git pull --ff-only
python scripts/screenshots.py
```

Copy `docs/screenshots/*.png` to `<scratchpad>/gui-review/before/`. Look at
every screenshot yourself before running any skill.

## 2. Run the review skills

Check the available skills and run each one that is installed. Give each the
screenshot paths and this context, so none of them asks again: PyQt6 Widgets
desktop app for Windows and Linux, mouse and keyboard, about 60 cm viewing
distance, German UI, no RTL, own colour tokens and QSS in
`mediavault/gui/theme.py`.

| Skill | What it adds | Run |
| --- | --- | --- |
| `design:design-critique` | first impression, hierarchy, consistency, what looks unfinished | always |
| `qt-development-skills:qt-ui-design` (section 5, audit) | rules: type scale, focus, WCAG, Hick/Miller, motion | always |
| `design:accessibility-review` | WCAG AA in depth: contrast, keyboard, target sizes | when the first two report contrast or keyboard problems |
| `design:ux-copy` | button labels, empty states, error texts | when a finding concerns wording |

A skill that is not installed is skipped; say which one in the report. Do not
install community skills on your own.

Back every contrast claim with numbers: `tests/test_theme.py` has a WCAG
contrast helper and test; compute the ratio instead of estimating it.

## 3. Compare the findings

Merge duplicates into one finding and build one table:

| # | Finding | Found by | Severity | Effort | Files |
| --- | --- | --- | --- | --- | --- |

- **Found by:** every skill that reported it. A finding from two or more
  skills ranks higher than one from a single skill.
- **Severity:** 🔴 breaks a rule (WCAG, misleading state, unreadable),
  🟡 friction or unfinished look, 🟢 polish.
- **Effort:** S (palette or QSS values), M (one widget or helper), L (new
  assets, layout rework, a decision Ben has to make first).
- Drop findings that need no change in this repo, and anything already
  listed as done in `CLAUDE.md` or fixed on `develop`.
- Note where the skills disagree, and which view you follow and why.

Rank by severity, then by how many skills found it, then by low effort. The
top **N** are the proposals.

## 4. Ask Ben (AskUserQuestion)

Show the comparison table and the N proposals in German first: per proposal
what changes, why, which skills found it, effort, files. Then ask: all N,
a selection (Ben names the numbers via "Other"), or cancel. Proposals with
effort L that need a decision (e.g. which icon set) are asked as their own
question. Without a clear yes, stop; change nothing.

## 5. Implement

1. New branch from `develop`, e.g. `fix/gui-design-review` or
   `feature/<topic>` (prefix rules in `CLAUDE.md`).
2. Implement only the confirmed proposals, in the existing structure: colours
   and sizes as tokens in `theme.py`, widgets through the helpers in
   `gui/widgets.py`. Dark and light must keep working, not only the theme the
   finding came from.
3. A test for each rule that can regress (contrast, allowed font sizes, a
   widget property), in `tests/`.
4. `pytest`, `ruff check mediavault tests scripts`, `graphify update .`
   (local only, never committed).
5. `python scripts/screenshots.py`, then look at every new screenshot. Fix
   what broke (clipped text, overflowing sidebar) before going on.

## 6. Before/after comparison

```bash
mkdir -p <scratchpad>/gui-review/after
cp docs/screenshots/*.png <scratchpad>/gui-review/after/
python .claude/skills/gui-design-review/compare.py \
  <scratchpad>/gui-review/before <scratchpad>/gui-review/after \
  <scratchpad>/gui-review/vergleich.png
```

Look at `vergleich.png`, then send it to Ben with `SendUserFile`
(`display: "render"`).

## 7. Commit, PR, report

Commit (screenshots included), push the branch and open a PR to `develop`
with the PR template. The PR body lists the implemented proposals with the
skills that found them. Do not merge.

Report in German: comparison table (short), what was implemented, PR link,
the comparison image, which skills ran or were skipped, and the proposals
that were not implemented, so they can be picked up later.
