#!/bin/bash
# Auto-trigger ui-reviewer for modified BakeryOS components at session end.
# Runs headless claude -p in background; exits quietly if no components changed.

PROJECT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MODIFIED=$(git -C "$PROJECT_DIR" diff --name-only HEAD 2>/dev/null | grep -E 'components/.*\.tsx$' | head -10)

if [ -z "$MODIFIED" ]; then
  exit 0
fi

FILES=$(echo "$MODIFIED" | tr '\n' ' ')
LOG="/tmp/bakeryos-ui-review-$(date +%Y%m%d-%H%M%S).log"

claude -p "Review these modified BakeryOS React components for UI convention issues:

Files: $FILES

Check each file for:
1. Dark mode coverage — every bg-white needs dark:bg-stone-800 or dark:bg-stone-900; every text-stone-900 needs dark:text-stone-50
2. Amber/stone palette — brand uses amber-600, neutral chrome uses stone-*
3. Tailwind only — no inline styles or CSS modules
4. Accessibility — interactive elements need clear labels or semantic roles

Report issues by file with the specific problematic class or pattern. Be concise." \
  --allowedTools "Read,Grep,Glob" \
  > "$LOG" 2>&1 &

python3 -c "
import json, sys
msg = 'UI review auto-started for: $FILES\nResults will be in: $LOG'
print(json.dumps({'systemMessage': msg}))
"
