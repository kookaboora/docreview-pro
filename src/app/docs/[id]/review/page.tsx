import Link from "next/link";
import { getDocumentById } from "@/app/lib/mockApi";
import { getDocContent } from "@/app/lib/docContent";
import { ReviewClient } from "./ReviewClient";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
          <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">
            Document not found
          </div>
          <div className="mt-2 text-sm text-[rgb(var(--muted))]">
            The document ID <span className="font-medium text-[rgb(var(--fg))]">{id}</span> does not exist.
          </div>
          <div className="mt-4">
            <Link
              href="/docs"
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
            >
              Back to Documents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latest = doc.versions.slice().sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const initialVersionId = latest?.id ?? doc.versions[0]?.id;

  if (!initialVersionId) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">
          No versions available
        </div>
        <div className="mt-2 text-sm text-[rgb(var(--muted))]">
          This document has no versions to review.
        </div>
      </div>
    );
  }

  // Load content for each version so switching is instant (mini project friendly)
  const contentsByVersionId: Record<string, ReturnType<typeof getDocContent>> = {};
  for (const v of doc.versions) {
    contentsByVersionId[v.id] = getDocContent(doc.id, v.id);
  }

  const initialContent = contentsByVersionId[initialVersionId];
  if (!initialContent) {
    return (
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">
          Content unavailable
        </div>
        <div className="mt-2 text-sm text-[rgb(var(--muted))]">
          No seeded content exists for this document/version yet.
        </div>
        <div className="mt-4">
          <Link
            href="/docs"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
          >
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewClient
      doc={doc}
      initialVersionId={initialVersionId}
      content={initialContent}
      contentsByVersionId={contentsByVersionId}
    />
  );
}