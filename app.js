// cPanel/Passenger entry point. Build on the host with `npm ci` and `npm run build`.
process.env.NODE_ENV = 'production'
const { createServer } = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
// Prebuilt uploads retain their original build directory to keep manifests/chunks consistent.
const receipt = path.join(__dirname, 'cpanel-build.json')
if (fs.existsSync(receipt)) {
  const { buildDir } = JSON.parse(fs.readFileSync(receipt, 'utf8'))
  if (!/^\.next(?:-[A-Za-z0-9_-]+)?$/.test(buildDir)) throw new Error('Invalid deployment build directory')
  if (process.env.NEXT_OUTPUT_DIR && process.env.NEXT_OUTPUT_DIR !== buildDir) throw new Error('NEXT_OUTPUT_DIR conflicts with the uploaded build')
  process.env.NEXT_OUTPUT_DIR = buildDir
}
const next = require('next')
const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port')
const app = next({ dev: false, dir: __dirname, hostname: '0.0.0.0', port })
const handle = app.getRequestHandler()
app.prepare().then(() => {
  const server = createServer((req, res) => {
    Promise.resolve(handle(req, res)).catch(() => {
      console.error('[server] Request failed')
      if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'text/plain'); res.setHeader('Cache-Control', 'no-store') }
      res.end('The request could not be completed.')
    })
  })
  server.on('error', error => { console.error('[server] Startup failed', error.code || 'SERVER_ERROR'); process.exit(1) })
  server.listen(port, '0.0.0.0', () => console.log(`Iceland Taxi application ready on port ${port}`))
}).catch(() => { console.error('[server] Application could not start. Verify the build and environment configuration.'); process.exit(1) })
