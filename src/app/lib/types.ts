export type DocTag = "Legal" | "HR" | "Compliance" | "Operations" | "Finance";

export type DocStatus = "Clean" | "HasIssues" | "NeedsReview";

export type Severity = "Low" | "Medium" | "High";

export type AnnotationStatus = "Open" | "Resolved" | "NeedsRemap";

export type User = {
  id: string;
  name: string;
  role: "Reviewer" | "Manager";
};

export type DocumentVersion = {
  id: string;
  docId: string;
  versionNumber: number; // 1,2,3...
  createdAt: string; // ISO
  title: string; // e.g., "Employment Contract v2"
};

export type Document = {
  id: string;
  title: string;
  tags: DocTag[];
  status: DocStatus;
  updatedAt: string; // ISO
  issueCount: number;
  versions: DocumentVersion[];
};

export type AnnotationCategory =
  | "MissingInfo"
  | "Formatting"
  | "Compliance"
  | "LegalRisk"
  | "Clarification";

export type AnnotationAnchor =
  | {
      kind: "TextRange";
      sectionId: string;
      start: number; // offset in section text
      end: number; // offset in section text
    }
  | {
      kind: "Unanchored";
      reason: "NotFoundInVersion" | "UserNeedsRemap";
    };

export type Annotation = {
  id: string;
  docId: string;
  versionId: string;
  quote: string;
  category: AnnotationCategory;
  severity: Severity;
  status: AnnotationStatus;
  assigneeId: string | null;
  comment: string;
  anchor: AnnotationAnchor;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type ActivityEvent =
  | {
      id: string;
      docId: string;
      type: "ANNOTATION_CREATED";
      at: string;
      meta: { annotationId: string; byUserId: string };
    }
  | {
      id: string;
      docId: string;
      type: "ANNOTATION_RESOLVED" | "ANNOTATION_REOPENED";
      at: string;
      meta: { annotationId: string; byUserId: string };
    }
  | {
      id: string;
      docId: string;
      type: "ASSIGNED";
      at: string;
      meta: { annotationId: string; byUserId: string; toUserId: string | null };
    }
  | {
      id: string;
      docId: string;
      type: "VERSION_ADDED";
      at: string;
      meta: { versionId: string; versionNumber: number; byUserId: string };
    };

export type DocsQuery = {
  q?: string; // search text
  tag?: DocTag | "All";
  status?: DocStatus | "All";
  sort?: "updated_desc" | "issues_desc" | "title_asc";
};