"""Package the current Next.js source for a Linux VPS build; never bundle private environments or native builds."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from datetime import datetime, timezone
import hashlib
import json

root = Path(__file__).resolve().parent.parent
output = root / 'deployment-artifacts'
output.mkdir(exist_ok=True)
archive = output / 'iceland-taxi-vps-source.zip'
fixed = [
    'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
    'eslint.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts', '.nvmrc', '.env.example',
    'docs/vps-deployment.md', 'docs/vps-validation.md', 'docs/vps-handoff.md',
    'docs/postgresql-migration.md', 'docs/auth-transition.md', 'docs/auth-setup.md',
    'docs/supabase-exit-audit.md', 'docs/local-development.md', 'scripts/package-vps.py',
]
files = [root / name for name in fixed]
for directory in ['src', 'public', 'prisma', 'deploy/vps', 'scripts/vps']:
    files.extend((root / directory).rglob('*'))
# Include the local validation helpers referenced by the runbooks, not old cPanel tooling.
files.extend((root / 'scripts').glob('check-*.mjs'))
files.extend(root / name for name in [
    'scripts/fixture-auth.mjs', 'scripts/bootstrap-admin.mjs', 'scripts/customer-browser-check.mjs',
    'scripts/driver-browser-check.mjs', 'scripts/admin-browser-check.mjs',
])
selected = []
for path in sorted(set(files)):
    relative = path.relative_to(root)
    if path.is_symlink() or not path.is_file():
        if str(relative) in fixed:
            raise RuntimeError(f'Required release file missing or linked: {relative}')
        continue
    if any((root / Path(*relative.parts[:index])).is_symlink() for index in range(1, len(relative.parts))):
        continue
    if any(part.startswith('.') and part not in ['.env.example', '.nvmrc'] for part in relative.parts):
        continue
    if path.suffix.lower() in ['.pem', '.key', '.log', '.dump', '.zip', '.node', '.so', '.dylib', '.pyc']:
        continue
    selected.append(path)
manifest = {
    'format': 1,
    'target': 'ubuntu-24.04-x86_64-node22-nextjs',
    'kind': 'source-only',
    'createdAt': datetime.now(timezone.utc).isoformat(),
    'files': {path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in selected},
}
with ZipFile(archive, 'w', ZIP_DEFLATED) as bundle:
    for path in selected:
        bundle.write(path, path.relative_to(root).as_posix())
    bundle.writestr('vps-release.json', json.dumps(manifest, indent=2) + '\n')
with ZipFile(archive) as bundle:
    names = bundle.namelist()
    required = ['package.json', 'src/lib/auth/server.ts', 'deploy/vps/iceland-taxi.service',
                'deploy/vps/environment.example', 'prisma/migrations/20261118000000_independent_auth/migration.sql']
    assert all(name in names for name in required)
    assert not any(name.startswith(('node_modules/', '.git/', '.next', 'deployment-artifacts/')) for name in names)
    assert not any(Path(name).name.startswith('.env') and Path(name).name != '.env.example' for name in names)
    assert '@supabase/' not in bundle.read('package.json').decode()
    assert 'better-auth' in json.loads(bundle.read('package.json'))['dependencies']
    for name, digest in manifest['files'].items():
        assert hashlib.sha256(bundle.read(name)).hexdigest() == digest
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{checksum}  {archive.name}\n')
print(f'Prepared {archive.name}: {len(names)} files, {archive.stat().st_size:,} bytes; source-only, no private env/dependencies/builds.')
