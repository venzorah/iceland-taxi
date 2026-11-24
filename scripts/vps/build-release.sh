#!/usr/bin/env bash
# Run in a NEW release directory under the resource-limited transient unit in the runbook.
set -euo pipefail
release_dir=$(pwd -P)
[[ "$release_dir" == /srv/iceland-taxi/releases/* ]] || { echo 'Use an isolated release directory' >&2; exit 1; }
[[ "$release_dir" != "$(readlink -f /srv/iceland-taxi/current 2>/dev/null || true)" ]] || { echo 'Cannot build the live release' >&2; exit 1; }
for candidate in .env .env.* prisma/.env prisma/.env.*; do
  [[ ! -e "$candidate" || "$candidate" == .env.example ]] || { echo 'Keep runtime secrets outside build directories' >&2; exit 1; }
done
# Start from an empty environment: runtime credentials inherited from a shell must
# never enter package lifecycle scripts, instrumentation or Next prerender workers.
build_env=(env -i "PATH=$PATH" "HOME=$HOME" "TMPDIR=${TMPDIR:-/tmp}"
  NODE_ENV=production NODE_OPTIONS=--max-old-space-size=2048 VPS_BUILD_CPUS=1
  NEXT_TELEMETRY_DISABLED=1 PUBLISH_OFFICIAL_CATALOGUE_ON_START=false ALLOW_DESTRUCTIVE_SEED=false)
# Only this public origin is accepted from the operator's shell.
[[ -z "${NEXT_PUBLIC_APP_URL:-}" ]] || build_env+=("NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL")
"${build_env[@]}" npm ci --include=dev
"${build_env[@]}" npm run build
# Activation and any explicitly approved catalogue replacement are separate steps.
