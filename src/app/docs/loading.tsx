export default function LoadingDocs() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-[rgb(var(--border))]" />
          <div className="h-4 w-72 animate-pulse rounded bg-[rgb(var(--border))]" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-[rgb(var(--border))]" />
      </div>

      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="h-5 w-80 animate-pulse rounded bg-[rgb(var(--border))]" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 animate-pulse rounded bg-[rgb(var(--border))]" />
                  <div className="h-5 w-20 animate-pulse rounded bg-[rgb(var(--border))]" />
                  <div className="h-5 w-24 animate-pulse rounded bg-[rgb(var(--border))]" />
                </div>
              </div>
              <div className="h-6 w-16 animate-pulse rounded bg-[rgb(var(--border))]" />
            </div>

            <div className="mt-4 flex gap-3">
              <div className="h-4 w-40 animate-pulse rounded bg-[rgb(var(--border))]" />
              <div className="h-4 w-28 animate-pulse rounded bg-[rgb(var(--border))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}