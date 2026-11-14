"""Create a source-only cPanel upload. No secrets, dependencies or local builds."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
output = root / 'deployment-artifacts'
output.mkdir(exist_ok=True)
archive = output / 'iceland-taxi-cpanel.zip'
files = [root / name for name in [
    'app.js', 'package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
    'eslint.config.mjs', 'postcss.config.mjs', 'tailwind.config.ts', '.nvmrc', '.env.example',
    'docs/cpanel-deployment.md', 'docs/deployment-readiness.md', 'docs/security-review.md',
    'scripts/check-database-security.mjs', 'scripts/check-connection.mjs',
    'scripts/apply-security-migrations.mjs',
]]
for directory in ['src', 'public', 'prisma']:
    files.extend(p for p in (root / directory).rglob('*') if p.is_file())
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
with ZipFile(archive) as bundle:
    names = bundle.namelist()
    assert 'app.js' in names and '.env.example' in names
    assert not any(name == '.env' or name.startswith(('node_modules/', '.next', '.git/')) for name in names)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(archive.with_suffix('.zip.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'Prepared {archive.name}: {len(names)} files, {archive.stat().st_size:,} bytes; secrets and local builds excluded.')
