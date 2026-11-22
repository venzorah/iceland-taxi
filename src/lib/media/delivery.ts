/** Direct Cloudinary CDN delivery; never send these URLs through the VPS image optimizer.
 * Preserve existing/signed transformations rather than stacking a second optimization pipeline.
 */
export function photoDelivery(src: string, width: number) {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.search || !Number.isInteger(width) || width < 100 || width > 2400) return src
    const match = url.pathname.match(/^(\/[^/]+\/image\/upload\/)(v\d+\/.*|iceland-taxi\/.*)$/)
    if (!match) return src
    url.pathname = `${match[1]}c_limit,w_${width}/f_auto/q_auto/${match[2]}`
    return url.toString()
  } catch { return src }
}
