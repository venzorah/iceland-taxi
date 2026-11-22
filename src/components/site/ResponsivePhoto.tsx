import { photoDelivery } from '@/lib/media/delivery'
type Props = { src: string; alt: string; className?: string; priority?: boolean; sizes?: string; width?: number; height?: number; 'aria-hidden'?: boolean }
export function ResponsivePhoto({ src, alt, className, priority = false, sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw', width = 1200, height = 800, ...rest }: Props) {
  const optimized = photoDelivery(src, width)
  return <img {...rest} src={optimized} srcSet={optimized !== src ? [480, 768, 1200, 1920].map(w => `${photoDelivery(src, w)} ${w}w`).join(', ') : undefined} sizes={optimized !== src ? sizes : undefined} width={width} height={height} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
}
