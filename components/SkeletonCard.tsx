export default function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-dark-800">
      {/* Image skeleton */}
      <div className="h-44 skeleton" />

      <div className="flex flex-col flex-1 p-5 space-y-3">
        {/* Badge skeleton */}
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full skeleton" />
          <div className="h-5 w-12 rounded-full skeleton" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-3/4 rounded skeleton" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-full rounded skeleton" />
          <div className="h-3 w-5/6 rounded skeleton" />
        </div>

        {/* Footer skeleton */}
        <div className="pt-4 border-t border-white/5 flex justify-between">
          <div className="h-3 w-16 rounded skeleton" />
          <div className="h-3 w-24 rounded skeleton" />
        </div>

        {/* Button skeleton */}
        <div className="h-10 w-full rounded-xl skeleton mt-2" />
      </div>
    </div>
  );
}
