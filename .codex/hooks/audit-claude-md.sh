#!/bin/bash
# Headless CLAUDE.md health audit for sourdough-pro-ai.
# Checks for stale tech references and configuration drift.
# Intended to run via cron; logs to ~/.claude/logs/

PROJECT_DIR="/Users/kevin/sourdough-pro-ai"
LOG_DIR="$HOME/.claude/logs"
LOG="$LOG_DIR/bakeryos-audit-$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR"

echo "=== BakeryOS CLAUDE.md Audit - $(date) ===" > "$LOG"

/Users/kevin/.local/bin/claude -p "Audit the CLAUDE.md file in /Users/kevin/sourdough-pro-ai for stale or incorrect information. Check for:

1. Any mention of Vercel, Vercel Analytics, or vercel.json that should say Cloudflare Workers instead
2. Any mention of Gemini, @google/genai, or GEMINI_API_KEY that should say Claude/Anthropic instead
3. Dev server ports — the Vite dev server should be port 3000, Wrangler should be 8787, Playwright runs on 3001
4. Any npm scripts or file paths referenced that no longer exist in the project
5. Any instructions that contradict the actual project structure

Run: Read CLAUDE.md, then spot-check the referenced files and scripts actually exist.
Report: list each issue found with the exact line or section, and the correction needed.
If everything looks correct, say so explicitly." \
  --allowedTools "Read,Grep,Glob,Bash" \
  >> "$LOG" 2>&1

echo "" >> "$LOG"
echo "=== Audit complete ===" >> "$LOG"
