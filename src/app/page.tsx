import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted))]">
              Review workspace
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--card-fg))]">
              Review documents like a team.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
              Highlight text, leave structured feedback, and keep issues organized across versions — without
              messy comment threads.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md bg-[rgb(var(--fg))] px-4 py-2 text-sm font-medium text-[rgb(var(--bg))] hover:opacity-90"
              >
                Open workspace
              </Link>

              <Link
                href="/docs/1/review?mode=viewer"
                className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                View shared link
              </Link>

              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                Repo
              </a>
            </div>

            <div className="mt-4 text-xs text-[rgb(var(--muted))]">
              Tip: Press <span className="font-medium text-[rgb(var(--fg))]">Cmd/Ctrl + K</span> inside the workspace.
            </div>
          </div>

          <div className="w-full md:w-[360px]">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">What you can do</div>

              <div className="mt-3 space-y-2">
                {[
                  ["Highlight + annotate", "Create issues tied to exact text."],
                  ["Triage fast", "Filter by status, category, severity, assignee."],
                  ["Handle versions", "Carry issues forward and remap when text changes."],
                  ["Share safely", "Viewer mode disables edits (link-based)."],
                ].map(([title, desc]) => (
                  <div
                    key={title}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3"
                  >
                    <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">{title}</div>
                    <div className="mt-1 text-sm text-[rgb(var(--muted))]">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Keyboard-first", "Cmd/Ctrl+K palette, J/K navigation, URL state."],
          ["Clean UI states", "Editor vs viewer mode, disabled actions, empty states."],
          ["Exportable demos", "Export/import JSON so you can demo without setup."],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
          >
            <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">{title}</div>
            <div className="mt-2 text-sm text-[rgb(var(--muted))]">{desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}