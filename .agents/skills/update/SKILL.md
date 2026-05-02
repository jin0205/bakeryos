---
name: update
description: Use when pulling latest changes from main, updating dependencies, or syncing the local branch with upstream — especially when uncommitted work is in progress or package.json conflicts are likely.
---

# Update — Pull Latest from Main

Safe workflow for pulling upstream changes while preserving local work.

## Steps

### 1. Stash uncommitted changes
```bash
git stash --include-untracked
```
Check whether there was anything to stash:
```bash
git stash list | head -1
```
Note the stash ref (e.g. `stash@{0}`) if one was created — you'll need it in step 5.

### 2. Pull latest from main
```bash
git pull origin main
```

### 3. If package.json has a merge conflict

Keep HEAD version and discard the incoming change:
```bash
git checkout --ours package.json
git add package.json
git commit -m "chore: resolve package.json conflict, keep HEAD"
```

> **Why HEAD?** Per AGENTS.md: when resolving `package.json` conflicts, prefer the HEAD version and regenerate the lockfile. Never try to hand-merge both sides.

### 4. Regenerate the lockfile and install
```bash
rm package-lock.json
npm install
```
This regenerates `package-lock.json` from the resolved `package.json`.

### 5. Restore stash (if step 1 created one)
```bash
git stash pop
```
If there are conflicts after popping, resolve them manually — do **not** use `git stash drop` unless you intend to discard the local work.

**Special case — untracked files already exist:** If `git stash pop` errors with `already exists, no checkout` but the tracked file changes are shown as `modified` in `git status`, the stash applied successfully for tracked files. The untracked files never left disk. Drop the stale stash entry: `git stash drop`.

## Quick Reference

| Situation | Command |
|-----------|---------|
| Stash everything (including untracked) | `git stash --include-untracked` |
| Pull main | `git pull origin main` |
| Keep our package.json on conflict | `git checkout --ours package.json && git add package.json` |
| Regenerate lockfile | `rm package-lock.json && npm install` |
| Restore stash | `git stash pop` |

## Common Mistakes

- **Merging both sides of package.json** — always take HEAD; lockfile regeneration handles the rest.
- **Forgetting `--include-untracked`** — untracked files are not stashed by default and can cause pull conflicts.
- **Running `npm install` before resolving conflicts** — install only after `package.json` is clean.
