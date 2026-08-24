export default function Skeleton({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl bg-surface-container-high ${className}`}
        />
      ))}
    </>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-container-low rounded-2xl hairline p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  )
}

export function SkeletonRoomCard() {
  return (
    <div className="bg-surface-container-low rounded-[20px] overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
          <Skeleton className="w-7 h-7 rounded-full shrink-0 -ml-2" />
          <Skeleton className="h-3 w-12 ml-1" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonStat() {
  return (
    <div className="bg-surface-container-low rounded-2xl hairline p-6 flex items-center gap-5">
      <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-12" />
      </div>
    </div>
  )
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
