import type { Document, DocsQuery, DocTag, DocStatus } from "./types";
import { documents as seededDocuments } from "./mockData";

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchesQuery(doc: Document, q?: string) {
  if (!q) return true;
  const nq = normalize(q);
  const hay = normalize(`${doc.title} ${doc.tags.join(" ")} ${doc.status}`);
  return hay.includes(nq);
}

function matchesTag(doc: Document, tag?: DocTag | "All") {
  if (!tag || tag === "All") return true;
  return doc.tags.includes(tag);
}

function matchesStatus(doc: Document, status?: DocStatus | "All") {
  if (!status || status === "All") return true;
  return doc.status === status;
}

function sortDocs(docs: Document[], sort?: DocsQuery["sort"]) {
  const copy = [...docs];
  switch (sort) {
    case "issues_desc":
      return copy.sort((a, b) => b.issueCount - a.issueCount);
    case "title_asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "updated_desc":
    default:
      return copy.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }
}

export async function getDocuments(query: DocsQuery = {}): Promise<Document[]> {
  // simulate network latency (feels real)
  await sleep(450);

  const filtered = seededDocuments
    .filter((d) => matchesQuery(d, query.q))
    .filter((d) => matchesTag(d, query.tag))
    .filter((d) => matchesStatus(d, query.status));

  return sortDocs(filtered, query.sort);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  await sleep(300);
  return seededDocuments.find((d) => d.id === id) ?? null;
}