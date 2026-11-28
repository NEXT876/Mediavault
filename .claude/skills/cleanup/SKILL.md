---
name: cleanup
description: Use when Ben asks to clean up, sync, or tidy the repos ("aufräumen", "räum auf", "sync mit Remote", "alles pushen", /cleanup) — local and GitHub out of sync, uncommitted changes, unpushed or stale branches. With the argument `merge` ("aufräumen und mergen", /cleanup merge) the feature branches also go to develop and then to main.
---

# Clean up and sync with GitHub

Brings every repo in the session in line with GitHub. Talk to Ben in German; commit titles, PR titles and PR bodies are in English. Authorship, branch names and commit titles follow `CLAUDE.md`.

**Scope:** every git repo in the session (MediaVault and siblings such as `rule-34-import`). The **integration branch** is `develop` if the repo has one, otherwise `main`.

## Hard rules

- **Ask before changing anything.** Step 1 only reads; step 2 asks once for everything; nothing is committed, pushed, merged or deleted before Ben says yes.
- Never push, commit or force-push to `main`. The only way into `main` is the `ship-develop` skill.
- Never touch `badges` (coverage badge branch of the CI) — not merge, not delete.
- Never delete a branch whose commits are not on GitHub or not in the integration branch, unless Ben named it in step 2.
- Never `git reset --hard`, `git clean` or discard uncommitted changes. Remote work always wins over a guess: on divergence, merge; on conflicts, stop and ask.

## 1. Look (read-only, per repo)

```bash
git fetch --prune --tags origin
git status -s                          # uncommitted changes
git stash list
git branch -vv                         # [ahead N], [behind N], [gone]
git branch -r                          # remote branches
```

Collect for each repo:

| Finding | How to see it |
|---|---|
| New on GitHub, not local | `behind N` in `git branch -vv`; remote branches with no local branch |
| Uncommitted changes | `git status -s` (ignore files in `.gitignore`, e.g. `graphify-out/`) |
| Local commits not on GitHub | `ahead N`, or a local branch without upstream |
| Stale local branch | upstream shows `[gone]` (GitHub deleted it after the merge) |

A `[gone]` branch is merged when its PR is merged (check with the GitHub MCP tools) or `git merge-base --is-ancestor <branch> <commit the PR was merged from>`. Squash merges make `git branch --merged` useless here — don't rely on it.

## 2. Ask Ben (AskUserQuestion)

One summary in German, per repo:
- what is new on GitHub and will be pulled
- the uncommitted changes, with the proposed commit title(s) (`<Type>: <what changes>`) and the target branch:
  - on a `feature/…`/`fix/…`/… branch: commit there
  - on `develop`: `Fix` directly on `develop` (CLAUDE.md allows it); anything else goes on a new branch `<type>/<name>` from `develop`
  - on `main`: never on `main` — new branch from `main`'s state, then treat it as above
- which branches get pushed
- which stale branches get deleted locally
- **with `merge`:** which branches get a PR into the integration branch, and that `ship-develop` follows (with its own confirmation)

Options: proceed, change something, cancel. Without a clear yes, stop.

## 3. Pull

For each local branch that is behind:
```bash
git checkout <branch> && git pull --ff-only
```
If it is behind **and** ahead (diverged): `git pull --no-rebase --no-edit`. On a conflict: `git merge --abort`, stop, tell Ben.
Remote branches without a local copy stay remote — no checkout needed.

Uncommitted changes in the way: `git stash`, pull, `git stash pop`. If the pop conflicts, stop and tell Ben (the stash stays).

## 4. Commit

```bash
git add -A
git commit --author "Ben Waibel <103282803+NEXT876@users.noreply.github.com>" \
  -m "<Type>: <what changes>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```
No `Claude-Session:` trailer. Run the tests first if code changed (`pytest -q`, `ruff check mediavault tests`, and `node --test` in `mobile/`); if they fail, don't commit — report it.

## 5. Push

```bash
git push -u origin <branch>            # every branch that is ahead or has no upstream, never main
```
A push rejected because GitHub moved on: back to step 3 for that branch, then push again. Never force.

## 6. Merge (only with `merge`)

For each branch other than `main`, `develop`, `badges` that has commits not in the integration branch:
1. PR into the integration branch. Body: `.github/pull_request_template.md` filled in (one type ticked). Title = squash commit title, `<Type>: <what changes>`. No session link, no "Generated with Claude Code" line.
2. Wait for the CI check on the PR (it runs on every PR, about a minute). Red → stop for this branch, report, go on with the next.
3. Squash-merge with `expectedHeadSha` = full SHA of the branch and `commit_message` = `Co-Authored-By: Claude <noreply@anthropic.com>`.
4. `git checkout <integration branch> && git pull --ff-only`, then `git branch -D <branch>` (GitHub deletes the remote branch).

Branches are merged one by one; after each merge the next PR is based on the updated integration branch. A PR with conflicts: stop for that branch and report.

When the integration branch is `develop` and it is ahead of `main`: run the **`ship-develop`** skill. It asks Ben again; that question is not skipped.

When the integration branch is `main` (repo without `develop`), the PRs go straight into `main` — that is that repo's normal workflow.

## 7. Tidy local

```bash
git fetch --prune origin
git branch -D <stale branch>           # only the ones confirmed in step 2
git checkout develop 2>/dev/null || git checkout main
```

## 8. Report

Short, in German, per repo: what was pulled, committed (titles), pushed, merged (PR links), deleted; final `git branch -vv` state, and anything that stopped (conflicts, red CI).

## Common mistakes

| Mistake | Correct |
|---|---|
| `git branch --merged` to find merged branches | Squash merges never show up there; check the PR or `merge-base --is-ancestor` |
| Deleting `badges` because it looks unmerged | It's the CI badge branch; leave it |
| Committing a feature directly on `develop` | Only `Fix` goes directly on `develop`; features get a branch |
| `git pull --rebase` on a shared branch | Merge, never rewrite pushed history |
| Merging into `main` via PR from a feature branch | Only `ship-develop` writes to `main` (except repos without `develop`) |
