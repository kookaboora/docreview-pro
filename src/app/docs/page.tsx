import Link from "next/link";
import { getDocuments } from "@/app/lib/mockApi";
import type { DocStatus, DocTag, DocsQuery } from "@/app/lib/types";
import { DocsToolbar } from "./DocsToolbar";

function StatusPill({ status }: { status: DocStatus }) {
  const label =
    status === "HasIssues" ? "Has issues" : status === "NeedsReview" ? "Needs review" : "Clean";

  return (
    <span className="inline-flex items-center rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--fg))]">
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function ActiveFilters({ query }: { query: DocsQuery }) {
  const chips: { k: string; v: string }[] = [];
  if (query.q) chips.push({ k: "Search", v: query.q });
  if (query.tag && query.tag !== "All") chips.push({ k: "Tag", v: String(query.tag) });
  if (query.status && query.status !== "All") chips.push({ k: "Status", v: String(query.status) });
  if (query.sort) chips.push({ k: "Sort", v: String(query.sort) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={`${c.k}:${c.v}`}
          className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-0.5 text-xs text-[rgb(var(--muted))]"
        >
          <span className="font-medium text-[rgb(var(--fg))]">{c.k}:</span> {c.v}
        </span>
      ))}
    </div>
  );
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const q = typeof sp.q === "string" ? sp.q : undefined;
  const tag = typeof sp.tag === "string" ? (sp.tag as DocTag) : undefined;
  const status = typeof sp.status === "string" ? (sp.status as DocStatus) : undefined;
  const sort = typeof sp.sort === "string" ? (sp.sort as DocsQuery["sort"]) : "updated_desc";

  const query: DocsQuery = {
    q: q?.trim() ? q.trim() : undefined,
    tag: tag ?? "All",
    status: status ?? "All",
    sort,
  };

  const docs = await getDocuments(query);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[rgb(var(--fg))]">
            Documents
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Step 3: URL-synced filters + search (server-rendered list, client toolbar).
          </p>
        </div>

        <Link
          href="/"
          className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
        >
          Back
        </Link>
      </div>

      <DocsToolbar />

      <ActiveFilters query={query} />

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
          <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">
            No documents match your filters
          </div>
          <div className="mt-2 text-sm text-[rgb(var(--muted))]">
            Try clearing filters or searching a different keyword.
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-[rgb(var(--card-fg))]">
                      {doc.title}
                    </h3>
                    <StatusPill status={doc.status} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {doc.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs text-[rgb(var(--muted))]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-[rgb(var(--muted))]">Issues</div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    {doc.issueCount}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[rgb(var(--muted))]">
                  Updated:{" "}
                  <span className="text-[rgb(var(--fg))]">{formatDate(doc.updatedAt)}</span>
                  <span className="mx-2 text-[rgb(var(--border))]">•</span>
                  Versions: <span className="text-[rgb(var(--fg))]">{doc.versions.length}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                    type="button"
                    disabled
                    title="Review workspace comes in Step 4"
                  >
                    Open review (Step 4)
                  </button>

                 <Link
  href={`/docs/${doc.id}/review`}
  className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
>
  Open review
</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}