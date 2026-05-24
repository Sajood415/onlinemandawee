export function CartPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading cart">
      <div className="h-36 rounded-3xl bg-neutral-200/70" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <div className="flex gap-4">
                <div className="h-32 w-32 rounded-xl bg-neutral-200" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-24 rounded bg-neutral-200" />
                  <div className="h-5 w-full rounded bg-neutral-200" />
                  <div className="h-4 w-2/3 rounded bg-neutral-200" />
                  <div className="h-10 w-40 rounded-xl bg-neutral-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-[520px] rounded-2xl bg-neutral-200/80" />
      </div>
    </div>
  );
}
