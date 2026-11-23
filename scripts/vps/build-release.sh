#!/usr/bin/env bash
# Run in a NEW release directory under the resource-limited transient unit in the runbook.
set -euo pipefail
release_dir=$(pwd -P)
[[ "$release_dir" == /srv/iceland-taxi/releases/* ]] || { echo 'Use an isolated release directory' >&2; exit 1; }
[[ "$release_dir" != "$(readlink -f /srv/iceland-taxi/current 2>/dev/null || true)" ]] || { echo 'Cannot build the live release' >&2; exit 1; }
[[ ! -e .env && ! -e .env.local && ! -e .env.production && ! -e .env.production.local ]] || { echo 'Keep runtime secrets outside build directories' >&2; exit 1; }
export NODE_ENV=production NODE_OPTIONS=--max-old-space-size=2048 VPS_BUILD_CPUS=1
# Build jobs intentionally have no production DB, SMTP, Teya or Supabase secret credentials.
npm ci --include=dev
npm run build
# This build has no database credentials. The official price list is published
# when the new release starts and systemd loads /etc/iceland-taxi/app.env.
# The deployment operator reviews checks and activates the release separately.
