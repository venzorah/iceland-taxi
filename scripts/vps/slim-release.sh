#!/usr/bin/env bash
# Remove build-only dependencies from a release that is not yet the live one.
# Run this only after `prisma migrate deploy` for that release.
set -euo pipefail
release_dir=$(pwd -P)
[[ "$release_dir" == /srv/iceland-taxi/releases/* ]] || { echo 'Use an isolated release directory' >&2; exit 1; }
live=$(readlink -f /srv/iceland-taxi/current 2>/dev/null || true)
[[ "$release_dir" != "$live" ]] || { echo 'Cannot slim the live release' >&2; exit 1; }
env -i "PATH=$PATH" "HOME=$HOME" "TMPDIR=${TMPDIR:-/tmp}" \
  NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
  npm prune --omit=dev
rm -rf .next/cache node_modules/.cache
mkdir -p .next/cache
echo "Slimmed $release_dir"
