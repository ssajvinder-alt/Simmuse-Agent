import { cn } from '@/lib/utils'

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

// Brand badge: the Simmuse mark (an orange S on a black rounded square). The PNG carries
// the rounded shape and transparent corners, so no tile/rounding classes here, and it reads
// the same on light and dark surfaces. Size via className (default size-14).
export function BrandMark({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('inline-flex size-14 shrink-0 items-center justify-center', className)} {...props}>
      <img alt="" className="size-full object-contain" src={assetPath('simmuse-icon.png')} />
    </span>
  )
}
