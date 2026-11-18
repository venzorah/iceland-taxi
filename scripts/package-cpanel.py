"""Create a source-only cPanel upload. No secrets, dependencies or local builds."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import argparse
import json
import re

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--build-dir", help="Include an existing production Next.js build; no server-side next build is required")
args = parser.parse_args()

root = Path(__file__).resolve().parent.parent
output = root / 'deployment-artifacts'
output.mkdir(exist_ok=True)
archive = output / ('iceland-taxi-cpanel-prebuilt.zip' if args.build_dir else 'iceland-taxi-cpanel.zip')
files = [root / name for name in [
    'app.js', 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
    'eslint.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts', '.nvmrc', '.env.example',
    'docs/cpanel-deployment.md', 'docs/deployment-readiness.md', 'docs/security-review.md', 'docs/hosting-troubleshooting.md',
    'scripts/check-database-security.mjs', 'scripts/check-connection.mjs',
    'scripts/apply-security-migrations.mjs', 'scripts/diagnose-hosting.cjs',
]]
for directory in ['src', 'public', 'prisma']:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file())
build = None
receipt = None
if args.build_dir:
    build = (root / args.build_dir).resolve()
    metadata = json.loads((build / 'required-server-files.json').read_text())
    directory = metadata['config']['distDir']
    if not re.fullmatch(r'\.next(?:-[A-Za-z0-9_-]+)?', directory) or build.name != directory:
        raise RuntimeError('Build directory must match the compiled Next.js distDir')
    build_id = (build / 'BUILD_ID').read_text().strip()
    if not build_id or not (build / 'server').is_dir() or not (build / 'static').is_dir():
        raise RuntimeError('A complete production build is required')
    receipt = {'version': 1, 'buildDir': directory, 'buildId': build_id}
with ZipFile(archive, 'w', ZIP_DEFLATED) as bundle:
    for path in sorted(set(files)):
        relative = path.relative_to(root)
        if not path.is_file():
            raise RuntimeError(f'Missing deployment file: {relative}')
        if path.is_symlink() or any(part.startswith('.') for part in relative.parts if part not in ['.env.example', '.nvmrc']):
            continue
        if path.suffix in ['.pem', '.key', '.log']:
            continue
        bundle.write(path, relative)
    if build:
        for path in sorted(build.rglob('*')):
            if not path.is_file() or path.is_symlink():
                continue
            relative = path.relative_to(build)
            if relative.parts[0] in ['cache', 'dev', 'standalone', 'diagnostics']:
                continue
            if path.suffix in ['.node', '.dylib', '.so', '.pem', '.key']:
                continue
            bundle.write(path, Path(receipt['buildDir']) / relative)
        bundle.writestr('cpanel-build.json', json.dumps(receipt, indent=2) + '\n')
with ZipFile(archive) as bundle:
    names = bundle.namelist()
    assert 'app.js' in names and '.env.example' in names
    assert not any(name == '.env' or name.startswith(('node_modules/', '.git/')) for name in names)
    if not build:
        assert not any(name.startswith('.next') for name in names)
    else:
        assert 'cpanel-build.json' in names and f"{receipt['buildDir']}/BUILD_ID" in names
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'Prepared {archive.name}: {len(names)} files, {archive.stat().st_size:,} bytes; secrets, node_modules and build caches excluded.')
