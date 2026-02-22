"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DocStatus, DocTag } from "@/app/lib/types";
import { DOC_SORTS, DOC_STATUSES, DOC_TAGS, type DocSort } from "@/app/lib/constants";

function buildUrl(pathname: string, params: URLSearchParams) {
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function DocsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const initialQ = sp.get("q") ?? "";
  const initialTag = (sp.get("tag") as DocTag | "All" | null) ?? "All";
  const initialStatus = (sp.get("status") as DocStatus | "All" | null) ?? "All";
  const initialSort = (sp.get("sort") as DocSort | null) ?? "updated_desc";

  const [q, setQ] = useState(initialQ);

  const current = useMemo(() => {
    return {
      tag: initialTag,
      status: initialStatus,
      sort: initialSort,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());

    if (!value || value === "All") params.delete(key);
    else params.set(key, value);

    // reset paging later if you add it
    params.delete("page");

    router.push(buildUrl(pathname, params));
  }

  function applySearch() {
    const params = new URLSearchParams(sp.toString());
    const trimmed = q.trim();

    if (!trimmed) params.delete("q");
    else params.set("q", trimmed);

    params.delete("page");
    router.push(buildUrl(pathname, params));
  }

  function clearAll() {
    setQ("");
    router.push(pathname);
  }

  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex w-full flex-col gap-2 md:max-w-xl">
          <label className="text-xs font-medium text-[rgb(var(--muted))]">
            Search documents
          </label>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder="Search by title, tags, status…"
              className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.35)]"
            />
            <button
              type="button"
              onClick={applySearch}
              className="h-10 shrink-0 rounded-md bg-[rgb(var(--fg))] px-4 text-sm font-medium text-[rgb(var(--bg))] hover:opacity-90"
            >
              Search
            </button>
          </div>

          <div className="text-xs text-[rgb(var(--muted))]">
            Tip: press <span className="font-semibold text-[rgb(var(--fg))]">Enter</span> to search.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {/* Tag */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[rgb(var(--muted))]">Tag</div>
          <select
            defaultValue={current.tag}
            onChange={(e) => setParam("tag", e.target.value)}
            className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.35)]"
          >
            <option value="All">All</option>
            {DOC_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[rgb(var(--muted))]">Status</div>
          <select
            defaultValue={current.status}
            onChange={(e) => setParam("status", e.target.value)}
            className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.35)]"
          >
            <option value="All">All</option>
            {DOC_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "HasIssues" ? "Has issues" : s === "NeedsReview" ? "Needs review" : "Clean"}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-[rgb(var(--muted))]">Sort</div>
          <select
            defaultValue={current.sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[rgba(99,102,241,0.35)]"
          >
            {DOC_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}