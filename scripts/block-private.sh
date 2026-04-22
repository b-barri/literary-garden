#!/bin/sh
# Pre-commit guard — blocks commits that include personal Kindle data or
# locally-downloaded book covers. These paths are also in .gitignore, so this
# hook only fires if someone force-adds them with `git add -f`.
#
# POSIX /bin/sh — no bash-isms, runs under Windows Git Bash too.

BLOCKED=$(git diff --cached --name-only | grep -E '^(data/raw/|data/processed/|public/covers/|My Clippings\.sdr/|book_cover/)' || true)

if [ -n "$BLOCKED" ]; then
  printf '\n\033[1;31mBLOCKED by pre-commit: personal Kindle data must not be committed.\033[0m\n\n'
  printf '%s\n' "$BLOCKED" | sed 's/^/  • /'
  printf '\nThese paths are gitignored for a reason — they reveal your reading life.\n'
  printf 'To unstage: git reset HEAD <file>\n'
  printf 'If you truly need to commit one of these (almost never), edit\n'
  printf 'scripts/block-private.sh to remove the matching prefix.\n\n'
  exit 1
fi
