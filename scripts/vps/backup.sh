#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir=/var/backups/iceland-taxi
# Fail before filling a small root disk. Monitoring must alert on failed backup units.
free_kb=$(df -Pk "$backup_dir" | awk 'NR==2 {print $4}')
(( free_kb > 5242880 )) || { echo 'Backup stopped: less than 5 GiB free' >&2; exit 1; }
exec 9>"$backup_dir/.backup.lock"
flock -n 9 || exit 1
stamp=$(date -u +%Y%m%dT%H%M%SZ)
partial="$backup_dir/$stamp.dump.partial"
trap 'rm -f "$partial"' EXIT
# Peer-authenticated postgres OS user. Never place a password in argv.
pg_dump --dbname=iceland_taxi --format=custom --no-owner --no-acl --file="$partial"
pg_restore --list "$partial" >/dev/null
mv "$partial" "$backup_dir/$stamp.dump"
(cd "$backup_dir" && sha256sum "$stamp.dump" > "$stamp.dump.sha256")
# Keep 14 daily recovery points. Off-site replication must complete separately.
find "$backup_dir" -maxdepth 1 -type f -name '*.dump*' -mtime +14 -delete
printf 'Database backup completed\n'
