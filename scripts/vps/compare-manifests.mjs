import {readFile} from 'node:fs/promises'
import {isDeepStrictEqual} from 'node:util'
if (process.argv.length !== 4) { console.error('Usage: node scripts/vps/compare-manifests.mjs source.json target.json'); process.exit(1) }
try {
 const [source,target]=await Promise.all(process.argv.slice(2).map(async file=>JSON.parse(await readFile(file,'utf8'))))
 if(source.format!==1 || target.format!==1 || !source.tables || !target.tables) throw new Error('Invalid manifest')
 const differences=[...new Set([...Object.keys(source.tables),...Object.keys(target.tables)])].sort().filter(name=>!isDeepStrictEqual(source.tables[name],target.tables[name]))
 if(differences.length) { console.error('Table content/count mismatch:',differences.join(', ')); process.exitCode=1 }
 else console.log(`Verified identical row counts and content fingerprints for ${Object.keys(source.tables).length} tables`)
} catch { console.error('Could not compare manifests'); process.exitCode=1 }
