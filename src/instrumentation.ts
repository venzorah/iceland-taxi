export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { publishCatalogueOnStart } = await import('./instrumentation-node')
    await publishCatalogueOnStart()
  }
}
