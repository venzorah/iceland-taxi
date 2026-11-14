// cPanel/Passenger entry point. Build on the host with `npm ci` and `npm run build`.
process.env.NODE_ENV = 'production'
const { createServer } = require('node:http')
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
