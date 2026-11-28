#!/usr/bin/env bash
# Delete release directories that are no longer the live app, the previous rollback, or a newer unactivated build.
# Pass --apply to delete. Without it, the script only prints the plan.
set -euo pipefail
root=${RELEASE_ROOT:-/srv/iceland-taxi/releases}
current_link=${CURRENT_LINK:-/srv/iceland-taxi/current}
apply=false
[[ "${1:-}" == "--apply" ]] && apply=true
[[ -d "$root" ]] || { echo 'Release directory is missing' >&2; exit 1; }
root=$(readlink -f "$root")
current=$(readlink -f "$current_link" 2>/dev/null || true)
[[ -n "$current" && "$current" == "$root"/* && -d "$current" ]] || { echo 'Current release is not inside the release directory' >&2; exit 1; }

keep="$current"
current_mtime=$(stat -c %Y "$current")
previous=""
previous_mtime=0
while IFS= read -r dir; do
  [[ -n "$dir" && -d "$dir" ]] || continue
  canonical=$(readlink -f "$dir")
  [[ "$canonical" == "$root"/* && "$canonical" != "$root" ]] || continue
  [[ "$canonical" == "$current" ]] && continue
  mtime=$(stat -c %Y "$canonical")
  if (( mtime >= current_mtime )); then
    keep+=$'\n'"$canonical"
    continue
  fi
  if (( mtime > previous_mtime )); then
    previous=$canonical
    previous_mtime=$mtime
  fi
done < <(find "$root" -mindepth 1 -maxdepth 1 -type d)
[[ -z "$previous" ]] || keep+=$'\n'"$previous"

kept() {
  local candidate=$1
  local item
  while IFS= read -r item; do
    [[ "$item" == "$candidate" ]] && return 0
  done <<< "$keep"
  return 1
}

removed=0
while IFS= read -r dir; do
  [[ -n "$dir" && -d "$dir" ]] || continue
  canonical=$(readlink -f "$dir")
  [[ "$canonical" == "$root"/* && "$canonical" != "$root" && "$canonical" != "$current" ]] || continue
  kept "$canonical" && continue
  if [[ "$apply" == true ]]; then
    rm -rf -- "$canonical"
    echo "Removed $canonical"
  else
    echo "Would remove $canonical"
  fi
  removed=$((removed + 1))
done < <(find "$root" -mindepth 1 -maxdepth 1 -type d)

echo "Keeping live release $current"
[[ -z "$previous" ]] || echo "Keeping previous release $previous"
if [[ "$apply" != true ]]; then
  echo "No files were deleted. Re-run with --apply after the new release is healthy."
fi
echo "Old releases selected: $removed"
