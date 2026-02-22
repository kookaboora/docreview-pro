"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Annotation,
  AnnotationAnchor,
  AnnotationCategory,
  AnnotationStatus,
  Document,
  DocumentVersion,
  Severity,
} from "@/app/lib/types";
import type { DocContent } from "@/app/lib/docContent";
import { users } from "@/app/lib/mockData";

function labelVersion(v: DocumentVersion) {
  return `v${v.versionNumber} • ${new Date(v.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  })}`;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  MissingInfo: "Missing info",
  Formatting: "Formatting",
  Compliance: "Compliance",
  LegalRisk: "Legal risk",
  Clarification: "Clarification",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  Low: "Low",
  Medium: "Medium",
  High: "High",
};

function nowIso() {
  return new Date().toISOString();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function genId(prefix: string) {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Math.random().toString(16).slice(2)}`;
}

type SelectionDraft =
  | {
      sectionId: string;
      paraIndex: number;
      startLocal: number;
      endLocal: number;
      quote: string;
      rect: DOMRect;
    }
  | null;

type TextRangeAnchor = {
  kind: "TextRange";
  sectionId: string;
  start: number;
  end: number;
};

function isTextRangeAnchor(anchor: AnnotationAnchor): anchor is TextRangeAnchor {
  const a = anchor as unknown as Record<string, unknown>;
  return (
    a?.kind === "TextRange" &&
    typeof a.sectionId === "string" &&
    typeof a.start === "number" &&
    typeof a.end === "number"
  );
}

type UnanchoredAnchor = {
  kind: "Unanchored";
  reason: "NotFoundInVersion" | "UserNeedsRemap";
};

function isUnanchoredAnchor(anchor: AnnotationAnchor): anchor is UnanchoredAnchor {
  const a = anchor as unknown as Record<string, unknown>;
  return a?.kind === "Unanchored" && (a.reason === "NotFoundInVersion" || a.reason === "UserNeedsRemap");
}

type ActivityItem =
  | {
      id: string;
      at: string;
      type: "ANNOTATION_CREATED";
      meta: { annotationId: string; quote: string; category: AnnotationCategory; severity: Severity };
    }
  | { id: string; at: string; type: "ANNOTATION_RESOLVED"; meta: { annotationId: string; quote: string } }
  | { id: string; at: string; type: "ANNOTATION_REOPENED"; meta: { annotationId: string; quote: string } }
  | {
      id: string;
      at: string;
      type: "ASSIGNEE_CHANGED";
      meta: { annotationId: string; quote: string; toUserId: string | null };
    }
  | { id: string; at: string; type: "VERSION_SWITCHED"; meta: { toVersionId: string } }
  | {
      id: string;
      at: string;
      type: "ANNOTATIONS_CARRIED_OVER";
      meta: { fromVersionId: string; toVersionId: string; count: number };
    }
  | { id: string; at: string; type: "ANNOTATION_REMAPPED"; meta: { annotationId: string; quote: string } };

function getSelectionDraft(viewerRoot: HTMLElement): SelectionDraft {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  if (sel.isCollapsed) return null;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  const common = range.commonAncestorContainer;
  const commonEl = (common.nodeType === 1 ? common : common.parentElement) as HTMLElement | null;
  if (!commonEl || !viewerRoot.contains(commonEl)) return null;

  const quote = sel.toString().trim();
  if (!quote) return null;

  const startEl =
    (range.startContainer.nodeType === 1
      ? (range.startContainer as Element)
      : (range.startContainer.parentElement as Element | null)) ?? null;

  const endEl =
    (range.endContainer.nodeType === 1
      ? (range.endContainer as Element)
      : (range.endContainer.parentElement as Element | null)) ?? null;

  const startPara = startEl?.closest("[data-para='true']") as HTMLElement | null;
  const endPara = endEl?.closest("[data-para='true']") as HTMLElement | null;

  if (!startPara || !endPara) return null;
  if (startPara !== endPara) return null;

  const sectionId = startPara.dataset.sectionId;
  const paraIndexStr = startPara.dataset.paraIndex;

  if (!sectionId || !paraIndexStr) return null;
  const paraIndex = Number(paraIndexStr);
  if (!Number.isFinite(paraIndex)) return null;

  const startLocal = range.startOffset;
  const endLocal = range.endOffset;
  if (startLocal === endLocal) return null;

  const s = Math.min(startLocal, endLocal);
  const e = Math.max(startLocal, endLocal);

  return { sectionId, paraIndex, startLocal: s, endLocal: e, quote, rect };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function renderHighlightedParagraph(
  paragraphText: string,
  highlights: Array<{ id: string; start: number; end: number; status: AnnotationStatus }>,
  onClickHighlight: (id: string) => void
) {
  if (highlights.length === 0) return paragraphText;

  const sorted = [...highlights].sort((a, b) => a.start - b.start);

  const parts: Array<
    | { kind: "text"; value: string; key: string }
    | { kind: "mark"; value: string; key: string; id: string; status: AnnotationStatus }
  > = [];

  let cursor = 0;

  for (const h of sorted) {
    const start = clamp(h.start, 0, paragraphText.length);
    const end = clamp(h.end, 0, paragraphText.length);
    if (end <= start) continue;

    if (start > cursor) parts.push({ kind: "text", value: paragraphText.slice(cursor, start), key: `t-${cursor}-${start}` });

    parts.push({
      kind: "mark",
      value: paragraphText.slice(start, end),
      key: `m-${start}-${end}-${h.id}`,
      id: h.id,
      status: h.status,
    });

    cursor = end;
  }

  if (cursor < paragraphText.length) parts.push({ kind: "text", value: paragraphText.slice(cursor), key: `t-${cursor}-end` });

  return (
    <>
      {parts.map((p) => {
        if (p.kind === "text") return <span key={p.key}>{p.value}</span>;

        const markClass =
          p.status === "Resolved"
            ? "bg-[rgba(34,197,94,0.22)] ring-1 ring-[rgba(34,197,94,0.25)]"
            : p.status === "NeedsRemap"
            ? "bg-[rgba(244,63,94,0.22)] ring-1 ring-[rgba(244,63,94,0.25)]"
            : "bg-[rgba(99,102,241,0.22)] ring-1 ring-[rgba(99,102,241,0.25)]";

        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onClickHighlight(p.id)}
            className={cx("inline rounded px-0.5 transition", markClass, "hover:bg-[rgba(99,102,241,0.30)]")}
          >
            {p.value}
          </button>
        );
      })}
    </>
  );
}

type StatusFilter = "All" | "Open" | "Resolved" | "NeedsRemap";
type TabKey = "issues" | "activity";
type Mode = "editor" | "viewer";

function toTabKey(t: "Issues" | "Activity"): TabKey {
  return t === "Activity" ? "activity" : "issues";
}
function fromTabKey(t: TabKey): "Issues" | "Activity" {
  return t === "activity" ? "Activity" : "Issues";
}

type ExportPayload = {
  schema: "review-mini-v1";
  exportedAt: string;
  docId: string;
  versionId: string;
  annotationsByVersion: Record<string, Annotation[]>;
  activity: ActivityItem[];
};

export function ReviewClient({
  doc,
  initialVersionId,
  content,
  contentsByVersionId,
}: {
  doc: Document;
  initialVersionId: string;
  content: DocContent;
  contentsByVersionId: Record<string, DocContent | null>;
}) {
  const [versionId, setVersionId] = useState(initialVersionId);
  const [annotationsByVersion, setAnnotationsByVersion] = useState<Record<string, Annotation[]>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: genId("ev"), at: nowIso(), type: "VERSION_SWITCHED", meta: { toVersionId: initialVersionId } },
  ]);

  const [activeTab, setActiveTab] = useState<"Issues" | "Activity">("Issues");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<AnnotationCategory | "All">("All");
  const [query, setQuery] = useState("");

  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft>(null);
  const [showModal, setShowModal] = useState(false);

  const [category, setCategory] = useState<AnnotationCategory>("Clarification");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [assigneeId, setAssigneeId] = useState<string | "">("");
  const [comment, setComment] = useState("");

  const [remapTargetId, setRemapTargetId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  const [mode, setMode] = useState<Mode>("editor");

  const isReadOnly = mode === "viewer";

  const currentContent = useMemo(() => contentsByVersionId[versionId] ?? null, [contentsByVersionId, versionId]);
  const versions = useMemo(() => doc.versions.slice().sort((a, b) => b.versionNumber - a.versionNumber), [doc.versions]);
  const currentSections = currentContent?.sections ?? content.sections;
  const currentAnnotations = annotationsByVersion[versionId] ?? [];

  function addActivity(item: ActivityItem) {
    setActivity((prev) => [item, ...prev]);
  }

  function updateUrl(next: { issue?: string | null; tab?: TabKey | null; mode?: Mode | null }) {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (next.issue === null) params.delete("issue");
    else if (typeof next.issue === "string" && next.issue) params.set("issue", next.issue);

    if (next.tab === null) params.delete("tab");
    else if (typeof next.tab === "string" && next.tab) params.set("tab", next.tab);

    if (next.mode === null) params.delete("mode");
    else if (typeof next.mode === "string" && next.mode) params.set("mode", next.mode);

    window.history.replaceState({}, "", `${url.pathname}?${params.toString()}`);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const issue = params.get("issue");
    const tab = params.get("tab") as TabKey | null;
    const m = params.get("mode") as Mode | null;

    if (tab === "issues" || tab === "activity") setActiveTab(fromTabKey(tab));
    if (issue) setSelectedAnnotationId(issue);
    if (m === "editor" || m === "viewer") setMode(m);
  }, []);

  useEffect(() => {
    updateUrl({ tab: toTabKey(activeTab) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    updateUrl({ issue: selectedAnnotationId ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnnotationId]);

  useEffect(() => {
    updateUrl({ mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filteredAnnotations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return currentAnnotations.filter((a) => {
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (severityFilter !== "All" && a.severity !== severityFilter) return false;
      if (categoryFilter !== "All" && a.category !== categoryFilter) return false;

      if (!q) return true;
      const hay = `${a.quote} ${a.comment ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [currentAnnotations, statusFilter, severityFilter, categoryFilter, query]);

  const selectedAnnotation = useMemo(() => {
    if (!selectedAnnotationId) return null;
    return currentAnnotations.find((a) => a.id === selectedAnnotationId) ?? null;
  }, [currentAnnotations, selectedAnnotationId]);

  const activityGrouped = useMemo(() => {
    const groups = new Map<string, ActivityItem[]>();
    for (const ev of activity) {
      const day = formatDay(ev.at);
      const arr = groups.get(day) ?? [];
      arr.push(ev);
      groups.set(day, arr);
    }
    return Array.from(groups.entries());
  }, [activity]);

  const needsRemapCount = useMemo(
    () => currentAnnotations.filter((a) => a.status === "NeedsRemap").length,
    [currentAnnotations]
  );

  function clearSelectionUI() {
    setSelectionDraft(null);
    setShowModal(false);
    window.getSelection()?.removeAllRanges();
  }

  function handleMouseUp() {
    if (isReadOnly) return;
    const viewer = viewerRef.current;
    if (!viewer) return;
    const draft = getSelectionDraft(viewer);
    if (!draft) {
      setSelectionDraft(null);
      return;
    }
    setSelectionDraft(draft);
  }

  function openCreateModal() {
    if (isReadOnly) return;
    if (!selectionDraft) return;
    setRemapTargetId(null);
    setComment("");
    setAssigneeId("");
    setCategory("Clarification");
    setSeverity("Medium");
    setShowModal(true);
  }

  function createAnnotation() {
    if (isReadOnly) return;
    const draft = selectionDraft;
    if (!draft) return;

    const id = genId("a");
    const newAnn: Annotation = {
      id,
      docId: doc.id,
      versionId,
      quote: draft.quote,
      category,
      severity,
      status: "Open",
      assigneeId: assigneeId ? assigneeId : null,
      comment: comment.trim(),
      anchor: {
        kind: "TextRange",
        sectionId: draft.sectionId,
        start: draft.startLocal,
        end: draft.endLocal,
      } as unknown as AnnotationAnchor,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setAnnotationsByVersion((prev) => {
      const existing = prev[versionId] ?? [];
      return { ...prev, [versionId]: [newAnn, ...existing] };
    });

    addActivity({
      id: genId("ev"),
      at: nowIso(),
      type: "ANNOTATION_CREATED",
      meta: { annotationId: id, quote: draft.quote, category, severity },
    });

    setSelectedAnnotationId(id);
    setActiveTab("Issues");
    clearSelectionUI();
  }

  function toggleResolved(id: string) {
    if (isReadOnly) return;
    const ann = currentAnnotations.find((a) => a.id === id);
    if (!ann) return;
    if (ann.status === "NeedsRemap") return;

    const nextStatus: AnnotationStatus = ann.status === "Resolved" ? "Open" : "Resolved";

    setAnnotationsByVersion((prev) => {
      const list = prev[versionId] ?? [];
      const next = list.map((a) => (a.id === id ? { ...a, status: nextStatus, updatedAt: nowIso() } : a));
      return { ...prev, [versionId]: next };
    });

    addActivity({
      id: genId("ev"),
      at: nowIso(),
      type: nextStatus === "Resolved" ? "ANNOTATION_RESOLVED" : "ANNOTATION_REOPENED",
      meta: { annotationId: id, quote: ann.quote },
    });
  }

  function changeAssignee(id: string, toUserId: string | null) {
    if (isReadOnly) return;
    const ann = currentAnnotations.find((a) => a.id === id);
    if (!ann) return;

    setAnnotationsByVersion((prev) => {
      const list = prev[versionId] ?? [];
      const next = list.map((a) => (a.id === id ? { ...a, assigneeId: toUserId, updatedAt: nowIso() } : a));
      return { ...prev, [versionId]: next };
    });

    addActivity({
      id: genId("ev"),
      at: nowIso(),
      type: "ASSIGNEE_CHANGED",
      meta: { annotationId: id, quote: ann.quote, toUserId },
    });
  }

  function handleClickHighlight(id: string) {
    setSelectedAnnotationId(id);
    setActiveTab("Issues");
  }

  function startRemap(id: string) {
    if (isReadOnly) return;
    setRemapTargetId(id);
    setActiveTab("Issues");
  }

  function cancelRemap() {
    setRemapTargetId(null);
  }

  function remapIssue() {
    if (isReadOnly) return;
    if (!remapTargetId) return;
    const draft = selectionDraft;
    if (!draft) return;

    const ann = currentAnnotations.find((a) => a.id === remapTargetId);
    if (!ann) return;

    setAnnotationsByVersion((prev) => {
      const list = prev[versionId] ?? [];
      const next = list.map((a) => {
        if (a.id !== remapTargetId) return a;
        return {
          ...a,
          status: "Open" as AnnotationStatus,
          quote: draft.quote,
          anchor: {
            kind: "TextRange",
            sectionId: draft.sectionId,
            start: draft.startLocal,
            end: draft.endLocal,
          } as unknown as AnnotationAnchor,
          updatedAt: nowIso(),
        };
      });
      return { ...prev, [versionId]: next };
    });

    addActivity({
      id: genId("ev"),
      at: nowIso(),
      type: "ANNOTATION_REMAPPED",
      meta: { annotationId: remapTargetId, quote: ann.quote },
    });

    setSelectedAnnotationId(remapTargetId);
    setRemapTargetId(null);
    clearSelectionUI();
  }

  const currentVersionIndex = useMemo(() => versions.findIndex((v) => v.id === versionId), [versions, versionId]);
  const previousVersionId = useMemo(() => {
    if (currentVersionIndex < 0) return null;
    const prev = versions[currentVersionIndex + 1];
    return prev?.id ?? null;
  }, [versions, currentVersionIndex]);

  function carryOverFromPrevious() {
    if (isReadOnly) return;
    if (!previousVersionId) return;

    const prevAnns = annotationsByVersion[previousVersionId] ?? [];
    const toCarry = prevAnns.filter((a) => a.status !== "Resolved");
    if (toCarry.length === 0) return;

    const carried: Annotation[] = toCarry.map((a) => {
      const id = genId("a");
      return {
        ...a,
        id,
        versionId,
        status: "NeedsRemap" as AnnotationStatus,
        anchor: { kind: "Unanchored", reason: "UserNeedsRemap" } as unknown as AnnotationAnchor,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
    });

    setAnnotationsByVersion((prev) => {
      const existing = prev[versionId] ?? [];
      return { ...prev, [versionId]: [...carried, ...existing] };
    });

    addActivity({
      id: genId("ev"),
      at: nowIso(),
      type: "ANNOTATIONS_CARRIED_OVER",
      meta: { fromVersionId: previousVersionId, toVersionId: versionId, count: carried.length },
    });
  }

  function exportJson() {
    const payload: ExportPayload = {
      schema: "review-mini-v1",
      exportedAt: nowIso(),
      docId: doc.id,
      versionId,
      annotationsByVersion,
      activity,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `review-export-${doc.id}-${versionId}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function importJsonFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<ExportPayload>;

      if (parsed.schema !== "review-mini-v1") return;
      if (!parsed.annotationsByVersion || !parsed.activity) return;

      setAnnotationsByVersion(parsed.annotationsByVersion as Record<string, Annotation[]>);
      setActivity(parsed.activity as ActivityItem[]);

      if (typeof parsed.versionId === "string") setVersionId(parsed.versionId);
      setSelectedAnnotationId(null);
      setRemapTargetId(null);
      clearSelectionUI();
    } catch {
      return;
    }
  }

  type PaletteAction = {
    id: string;
    label: string;
    hint?: string;
    run: () => void;
    disabled?: boolean;
  };

  function copyShareLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    url.searchParams.set("tab", toTabKey(activeTab));
    if (selectedAnnotationId) url.searchParams.set("issue", selectedAnnotationId);
    else url.searchParams.delete("issue");

    void navigator.clipboard?.writeText(url.toString());
  }

  const paletteActions = useMemo<PaletteAction[]>(() => {
    const actions: PaletteAction[] = [
      { id: "tab_issues", label: "Go to Issues", hint: "tab", run: () => setActiveTab("Issues") },
      { id: "tab_activity", label: "Go to Activity", hint: "tab", run: () => setActiveTab("Activity") },
      { id: "focus_search", label: "Focus search", hint: "/", run: () => searchInputRef.current?.focus() },
      {
        id: "mode_editor",
        label: "Mode: Editor",
        hint: "share",
        run: () => setMode("editor"),
      },
      {
        id: "mode_viewer",
        label: "Mode: Viewer (read-only)",
        hint: "share",
        run: () => setMode("viewer"),
      },
      { id: "copy_link", label: "Copy share link", hint: "share", run: copyShareLink },
      {
        id: "filters_clear",
        label: "Clear filters",
        hint: "filters",
        run: () => {
          setStatusFilter("All");
          setSeverityFilter("All");
          setCategoryFilter("All");
          setQuery("");
        },
      },
      { id: "status_all", label: "Status: All", run: () => setStatusFilter("All") },
      { id: "status_open", label: "Status: Open", run: () => setStatusFilter("Open") },
      { id: "status_resolved", label: "Status: Resolved", run: () => setStatusFilter("Resolved") },
      { id: "status_needsremap", label: "Status: Needs remap", run: () => setStatusFilter("NeedsRemap") },
      { id: "export_json", label: "Export JSON", hint: "demo", run: exportJson },
      {
        id: "import_json",
        label: "Import JSON",
        hint: "demo",
        run: () => importInputRef.current?.click(),
      },
    ];

    return actions;
  }, [activeTab, mode, selectedAnnotationId, isReadOnly]);

  const paletteFiltered = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return paletteActions;
    return paletteActions.filter((a) => `${a.label} ${a.hint ?? ""}`.toLowerCase().includes(q));
  }, [paletteActions, paletteQuery]);

  function openPalette() {
    setPaletteOpen(true);
    setPaletteQuery("");
    setPaletteIndex(0);
  }

  function closePalette() {
    setPaletteOpen(false);
    setPaletteQuery("");
    setPaletteIndex(0);
  }

  function closeAllOverlays() {
    closePalette();
    setShowModal(false);
    setRemapTargetId(null);
    clearSelectionUI();
  }

  function moveIssueSelection(delta: number) {
    if (activeTab !== "Issues") return;
    if (filteredAnnotations.length === 0) return;

    const currentIndex = Math.max(
      0,
      filteredAnnotations.findIndex((a) => a.id === selectedAnnotationId)
    );

    const nextIndex = clamp(currentIndex + delta, 0, filteredAnnotations.length - 1);
    setSelectedAnnotationId(filteredAnnotations[nextIndex].id);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key;

      const isCmdK = (e.metaKey || e.ctrlKey) && key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else openPalette();
        return;
      }

      if (key === "Escape") {
        if (paletteOpen || showModal || remapTargetId || selectionDraft) {
          e.preventDefault();
          closeAllOverlays();
        }
        return;
      }

      if (paletteOpen) {
        if (key === "ArrowDown") {
          e.preventDefault();
          setPaletteIndex((i) => clamp(i + 1, 0, Math.max(0, paletteFiltered.length - 1)));
          return;
        }
        if (key === "ArrowUp") {
          e.preventDefault();
          setPaletteIndex((i) => clamp(i - 1, 0, Math.max(0, paletteFiltered.length - 1)));
          return;
        }
        if (key === "Enter") {
          e.preventDefault();
          const item = paletteFiltered[paletteIndex];
          if (!item) return;
          item.run();
          closePalette();
          return;
        }
        return;
      }

      if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTyping = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (key.toLowerCase() === "j") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTyping = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          moveIssueSelection(+1);
        }
        return;
      }

      if (key.toLowerCase() === "k") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTyping = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          moveIssueSelection(-1);
        }
        return;
      }

      if (key === "Enter") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTyping = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;
        if (isTyping) return;

        if (!isReadOnly && activeTab === "Issues" && selectedAnnotation) {
          if (selectedAnnotation.status !== "NeedsRemap") {
            e.preventDefault();
            toggleResolved(selectedAnnotation.id);
          }
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    paletteOpen,
    paletteFiltered,
    paletteIndex,
    showModal,
    remapTargetId,
    selectionDraft,
    activeTab,
    filteredAnnotations,
    selectedAnnotationId,
    selectedAnnotation,
    isReadOnly,
  ]);

  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteIndex(0);
  }, [paletteOpen, paletteQuery]);

  function scrollToSection(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const floatingStyle = useMemo(() => {
    if (!selectionDraft) return null;
    const r = selectionDraft.rect;
    const top = Math.max(8, r.top + window.scrollY - 46);
    const left = Math.max(8, r.left + window.scrollX);
    return { position: "absolute" as const, top, left };
  }, [selectionDraft]);

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importJsonFile(file);
          e.currentTarget.value = "";
        }}
      />

      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={closePalette} aria-label="Close" />
          <div className="relative w-full max-w-xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-lg">
            <input
              autoFocus
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Type a command…"
              className="h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))]"
            />
            <div className="mt-2 max-h-[360px] overflow-auto rounded-xl border border-[rgb(var(--border))]">
              {paletteFiltered.length === 0 ? (
                <div className="p-3 text-sm text-[rgb(var(--muted))]">No commands</div>
              ) : (
                paletteFiltered.map((a, idx) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      a.run();
                      closePalette();
                    }}
                    className={cx(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                      idx === paletteIndex ? "bg-[rgb(var(--bg))] text-[rgb(var(--fg))]" : "text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                    )}
                  >
                    <span className="truncate">{a.label}</span>
                    {a.hint && <span className="ml-3 shrink-0 text-xs text-[rgb(var(--muted))]">{a.hint}</span>}
                  </button>
                ))
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--muted))]">
              <span>Enter: run • ↑↓: move • Esc: close</span>
              <span>Cmd/Ctrl+K</span>
            </div>
          </div>
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm text-[rgb(var(--fg))]">
          <span className="font-semibold">Viewer mode:</span> read-only link. Switch to <span className="font-medium">Editor</span> to make changes.
        </div>
      )}

      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[rgb(var(--muted))]">Review workspace</div>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[rgb(var(--fg))]">{doc.title}</h1>
            <div className="mt-1 text-sm text-[rgb(var(--muted))]">
              Issues: <span className="font-medium text-[rgb(var(--fg))]">{currentAnnotations.length}</span>
              <span className="mx-2 text-[rgb(var(--border))]">•</span>
              Needs remap: <span className="font-medium text-[rgb(var(--fg))]">{needsRemapCount}</span>
              <span className="mx-2 text-[rgb(var(--border))]">•</span>
              Filtered: <span className="font-medium text-[rgb(var(--fg))]">{filteredAnnotations.length}</span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-[rgb(var(--muted))]">Version</div>
              <select
                value={versionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setVersionId(next);
                  setSelectedAnnotationId(null);
                  setSelectionDraft(null);
                  setShowModal(false);
                  setRemapTargetId(null);
                  addActivity({ id: genId("ev"), at: nowIso(), type: "VERSION_SWITCHED", meta: { toVersionId: next } });
                }}
                className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {labelVersion(v)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={mode}
                onChange={(e) => {
                  const m = e.target.value as Mode;
                  setMode(m);
                  setPaletteOpen(false);
                  setShowModal(false);
                  setRemapTargetId(null);
                  setSelectionDraft(null);
                }}
                className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
                title="Role"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="button"
                onClick={copyShareLink}
                className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                Copy link
              </button>

              <button
                type="button"
                onClick={carryOverFromPrevious}
                disabled={!previousVersionId || isReadOnly}
                className={cx(
                  "h-10 rounded-md px-3 text-sm font-medium",
                  !previousVersionId || isReadOnly
                    ? "border border-[rgb(var(--border))] text-[rgb(var(--muted))] opacity-60"
                    : "border border-[rgb(var(--border))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                )}
              >
                Carry over
              </button>

              <button
                type="button"
                onClick={exportJson}
                className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                Export JSON
              </button>

              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                Import JSON
              </button>

              <button
                type="button"
                onClick={() => (paletteOpen ? closePalette() : openPalette())}
                className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                title="Cmd/Ctrl+K"
              >
                Cmd+K
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
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

      {selectionDraft && floatingStyle && !isReadOnly && (
        <div style={floatingStyle} className="z-40">
          <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 shadow-sm">
            {remapTargetId ? (
              <>
                <button
                  type="button"
                  onClick={remapIssue}
                  className="rounded-md bg-[rgb(var(--fg))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--bg))] hover:opacity-90"
                >
                  Remap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelRemap();
                    clearSelectionUI();
                  }}
                  className="rounded-md border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-md bg-[rgb(var(--fg))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--bg))] hover:opacity-90"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={clearSelectionUI}
                  className="rounded-md border border-[rgb(var(--border))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          <div className="mt-1 max-w-xs truncate text-xs text-[rgb(var(--muted))]">“{selectionDraft.quote}”</div>
        </div>
      )}

      {showModal && selectionDraft && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={clearSelectionUI} aria-label="Close" />
          <div className="relative w-full max-w-lg rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-lg">
            <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">Create annotation</div>

            <div className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
              <div className="text-xs font-medium text-[rgb(var(--muted))]">Quote</div>
              <div className="mt-1 text-sm text-[rgb(var(--fg))]">“{selectionDraft.quote}”</div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <div className="text-xs font-medium text-[rgb(var(--muted))]">Category</div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AnnotationCategory)}
                  className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[rgb(var(--muted))]">Severity</div>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
                >
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="text-xs font-medium text-[rgb(var(--muted))]">Assignee</div>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="text-xs font-medium text-[rgb(var(--muted))]">Comment</div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[96px] w-full resize-none rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={clearSelectionUI}
                className="h-10 rounded-md border border-[rgb(var(--border))] px-4 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createAnnotation}
                className="h-10 rounded-md bg-[rgb(var(--fg))] px-4 text-sm font-medium text-[rgb(var(--bg))] hover:opacity-90"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_360px]">
        <aside className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
          <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">Sections</div>
          <div className="mt-3 space-y-1">
            {currentSections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className="w-full rounded-md px-2 py-2 text-left text-sm text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                type="button"
              >
                <div className="truncate">{s.title}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">Document</div>
            <div className="text-xs text-[rgb(var(--muted))]">
              {isReadOnly ? "Viewer mode" : remapTargetId ? "Select text to remap" : "Select text to annotate"}
            </div>
          </div>

          <div ref={viewerRef} onMouseUp={handleMouseUp} className="mt-4 space-y-8">
            {currentSections.map((s) => (
              <div key={s.id} id={`section-${s.id}`} className="scroll-mt-24">
                <h2 className="text-base font-semibold text-[rgb(var(--fg))]">{s.title}</h2>

                <div className="mt-2 space-y-3">
                  {s.paragraphs.map((p, idx) => {
                    const paragraphHighlights: Array<{ id: string; start: number; end: number; status: AnnotationStatus }> = [];
                    for (const ann of currentAnnotations) {
                      if (!isTextRangeAnchor(ann.anchor)) continue;
                      if (ann.anchor.sectionId !== s.id) continue;
                      paragraphHighlights.push({ id: ann.id, start: ann.anchor.start, end: ann.anchor.end, status: ann.status });
                    }

                    return (
                      <p key={idx} className="text-sm leading-6 text-[rgb(var(--fg))]">
                        <span data-para="true" data-section-id={s.id} data-para-index={idx}>
                          {renderHighlightedParagraph(p, paragraphHighlights, handleClickHighlight)}
                        </span>
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("Issues")}
              className={cx(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium",
                activeTab === "Issues"
                  ? "bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                  : "border border-[rgb(var(--border))] text-[rgb(var(--muted))]"
              )}
            >
              Issues
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("Activity")}
              className={cx(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium",
                activeTab === "Activity"
                  ? "bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                  : "border border-[rgb(var(--border))] text-[rgb(var(--muted))]"
              )}
            >
              Activity
            </button>
          </div>

          {activeTab === "Issues" && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
                <div className="text-xs font-semibold text-[rgb(var(--muted))]">Filters</div>

                <div className="mt-2 space-y-2">
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search… (Press /)"
                    className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))]"
                  />

                  <div className="grid gap-2 md:grid-cols-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))]"
                    >
                      <option value="All">All</option>
                      <option value="Open">Open</option>
                      <option value="Resolved">Resolved</option>
                      <option value="NeedsRemap">Needs remap</option>
                    </select>

                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as Severity | "All")}
                      className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))]"
                    >
                      <option value="All">All severities</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as AnnotationCategory | "All")}
                      className="h-10 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))]"
                    >
                      <option value="All">All categories</option>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                    <span>{isReadOnly ? "Viewer" : "J/K navigate • Enter toggle"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("All");
                        setSeverityFilter("All");
                        setCategoryFilter("All");
                        setQuery("");
                      }}
                      className="rounded-md border border-[rgb(var(--border))] px-2 py-1 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {filteredAnnotations.length === 0 ? (
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">No issues</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAnnotations.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAnnotationId(a.id)}
                      className={cx(
                        "w-full rounded-xl border p-3 text-left transition",
                        "border-[rgb(var(--border))] bg-[rgb(var(--bg))] hover:bg-[rgb(var(--card))]",
                        selectedAnnotationId === a.id && "ring-2 ring-[rgba(99,102,241,0.35)]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">{CATEGORY_LABELS[a.category]}</div>
                          <div className="mt-1 truncate text-xs text-[rgb(var(--muted))]">“{a.quote}”</div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs font-medium text-[rgb(var(--muted))]">{SEVERITY_LABELS[a.severity]}</div>
                          <div className="mt-1 inline-flex rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--fg))]">
                            {a.status}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedAnnotation && (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--card-fg))]">Issue</div>

                  <div className="mt-2 text-xs text-[rgb(var(--muted))]">Quote</div>
                  <div className="mt-1 text-sm text-[rgb(var(--fg))]">“{selectedAnnotation.quote}”</div>

                  <div className="mt-3 text-xs text-[rgb(var(--muted))]">Anchor</div>
                  <div className="mt-1 text-sm text-[rgb(var(--fg))]">
                    {isTextRangeAnchor(selectedAnnotation.anchor)
                      ? `TextRange • ${selectedAnnotation.anchor.sectionId} • ${selectedAnnotation.anchor.start}-${selectedAnnotation.anchor.end}`
                      : isUnanchoredAnchor(selectedAnnotation.anchor)
                      ? `Unanchored • ${selectedAnnotation.anchor.reason}`
                      : "Unanchored"}
                  </div>

                  <div className="mt-3 text-sm">
                    <div className="text-xs text-[rgb(var(--muted))]">Comment</div>
                    <div className="text-[rgb(var(--fg))]">
                      {selectedAnnotation.comment || <span className="text-[rgb(var(--muted))]">None</span>}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-medium text-[rgb(var(--muted))]">Assignee</div>
                    <select
                      value={selectedAnnotation.assigneeId ?? ""}
                      onChange={(e) => changeAssignee(selectedAnnotation.id, e.target.value || null)}
                      className="h-10 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 text-sm text-[rgb(var(--fg))]"
                      disabled={isReadOnly}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleResolved(selectedAnnotation.id)}
                      className="h-10 rounded-md bg-[rgb(var(--fg))] px-3 text-sm font-medium text-[rgb(var(--bg))] hover:opacity-90 disabled:opacity-60"
                      disabled={isReadOnly || selectedAnnotation.status === "NeedsRemap"}
                      title={selectedAnnotation.status === "NeedsRemap" ? "Remap first" : ""}
                    >
                      {selectedAnnotation.status === "Resolved" ? "Reopen" : "Resolve"}
                    </button>

                    {selectedAnnotation.status === "NeedsRemap" ? (
                      <button
                        type="button"
                        onClick={() => startRemap(selectedAnnotation.id)}
                        className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))] disabled:opacity-60"
                        disabled={isReadOnly}
                      >
                        Start remap
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedAnnotationId(null)}
                        className="h-10 rounded-md border border-[rgb(var(--border))] px-3 text-sm font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
                      >
                        Close
                      </button>
                    )}
                  </div>

                  {isReadOnly && <div className="mt-2 text-xs text-[rgb(var(--muted))]">Viewer mode: actions disabled.</div>}
                </div>
              )}
            </div>
          )}

          {activeTab === "Activity" && (
            <div className="mt-4 space-y-4">
              {activityGrouped.map(([day, events]) => (
                <div key={day}>
                  <div className="text-xs font-semibold text-[rgb(var(--muted))]">{day}</div>
                  <div className="mt-2 space-y-2">
                    {events.map((ev) => {
                      let title = "";
                      let detail: string | null = null;

                      if (ev.type === "ANNOTATION_CREATED") {
                        title = "Created";
                        detail = `${CATEGORY_LABELS[ev.meta.category]} • ${SEVERITY_LABELS[ev.meta.severity]} • “${ev.meta.quote}”`;
                      } else if (ev.type === "ANNOTATION_RESOLVED") {
                        title = "Resolved";
                        detail = `“${ev.meta.quote}”`;
                      } else if (ev.type === "ANNOTATION_REOPENED") {
                        title = "Reopened";
                        detail = `“${ev.meta.quote}”`;
                      } else if (ev.type === "ASSIGNEE_CHANGED") {
                        title = "Assignee";
                        const name =
                          ev.meta.toUserId ? users.find((u) => u.id === ev.meta.toUserId)?.name ?? "Unknown" : "Unassigned";
                        detail = `${name} • “${ev.meta.quote}”`;
                      } else if (ev.type === "VERSION_SWITCHED") {
                        title = "Version";
                        detail = `To ${ev.meta.toVersionId}`;
                      } else if (ev.type === "ANNOTATIONS_CARRIED_OVER") {
                        title = "Carry over";
                        detail = `${ev.meta.count} issues • ${ev.meta.fromVersionId} → ${ev.meta.toVersionId}`;
                      } else if (ev.type === "ANNOTATION_REMAPPED") {
                        title = "Remapped";
                        detail = `“${ev.meta.quote}”`;
                      }

                      return (
                        <div key={ev.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</div>
                              {detail && <div className="mt-1 truncate text-xs text-[rgb(var(--muted))]">{detail}</div>}
                            </div>
                            <div className="shrink-0 text-xs text-[rgb(var(--muted))]">{formatTime(ev.at)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}