#!/usr/bin/env bash
# ops/push-with-rebase.sh — push HEAD to the current branch, retrying with a
# rebase when the remote moved (bot scrape workflows push to master
# concurrently and a plain `git push` non-deterministically loses the race).
# Exits 1 with a loud ::error:: if all attempts fail.
set -uo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"
for i in 1 2 3 4 5; do
  if git push origin "$branch"; then
    echo "pushed on attempt $i"
    exit 0
  fi
  echo "push attempt $i failed; rebasing onto origin/$branch"
  # --autostash: scraper runs can leave untracked/dirty files (data, ops logs)
  # that would otherwise block the rebase.
  git pull --rebase --autostash origin "$branch" || git rebase --abort
  sleep $((i * 10))
done
echo "::error::could not push to origin/$branch after 5 attempts"
exit 1
