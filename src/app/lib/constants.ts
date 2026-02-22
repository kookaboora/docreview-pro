import type { DocStatus, DocTag } from "./types";

export const DOC_TAGS: DocTag[] = ["Legal", "HR", "Compliance", "Operations", "Finance"];

export const DOC_STATUSES: DocStatus[] = ["Clean", "HasIssues", "NeedsReview"];

export const DOC_SORTS = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "issues_desc", label: "Most issues" },
  { value: "title_asc", label: "Title (A–Z)" },
] as const;

export type DocSort = (typeof DOC_SORTS)[number]["value"];