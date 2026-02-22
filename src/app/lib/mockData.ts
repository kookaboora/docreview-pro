import type { Document, User } from "./types";

const now = new Date();

function isoDaysAgo(days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const users: User[] = [
  { id: "u1", name: "Harshal", role: "Reviewer" },
  { id: "u2", name: "Alex Kim", role: "Reviewer" },
  { id: "u3", name: "Mia Thompson", role: "Manager" },
];

export const documents: Document[] = [
  {
    id: "d1",
    title: "Employment Contract — Contractor (KR/NZ)",
    tags: ["Legal", "HR", "Compliance"],
    status: "HasIssues",
    updatedAt: isoDaysAgo(1),
    issueCount: 6,
    versions: [
      {
        id: "v1",
        docId: "d1",
        versionNumber: 1,
        createdAt: isoDaysAgo(12),
        title: "Employment Contract v1",
      },
      {
        id: "v2",
        docId: "d1",
        versionNumber: 2,
        createdAt: isoDaysAgo(1),
        title: "Employment Contract v2",
      },
    ],
  },
  {
    id: "d2",
    title: "Vendor Onboarding Checklist",
    tags: ["Operations", "Compliance"],
    status: "NeedsReview",
    updatedAt: isoDaysAgo(3),
    issueCount: 0,
    versions: [
      {
        id: "v3",
        docId: "d2",
        versionNumber: 1,
        createdAt: isoDaysAgo(30),
        title: "Vendor Onboarding v1",
      },
      {
        id: "v4",
        docId: "d2",
        versionNumber: 2,
        createdAt: isoDaysAgo(3),
        title: "Vendor Onboarding v2",
      },
    ],
  },
  {
    id: "d3",
    title: "Safety & Incident Report Template",
    tags: ["Operations", "HR"],
    status: "Clean",
    updatedAt: isoDaysAgo(7),
    issueCount: 0,
    versions: [
      {
        id: "v5",
        docId: "d3",
        versionNumber: 1,
        createdAt: isoDaysAgo(60),
        title: "Safety Report v1",
      },
      {
        id: "v6",
        docId: "d3",
        versionNumber: 2,
        createdAt: isoDaysAgo(7),
        title: "Safety Report v2",
      },
    ],
  },
  {
    id: "d4",
    title: "Client MSA — SaaS Services",
    tags: ["Legal", "Finance"],
    status: "HasIssues",
    updatedAt: isoDaysAgo(2),
    issueCount: 9,
    versions: [
      {
        id: "v7",
        docId: "d4",
        versionNumber: 1,
        createdAt: isoDaysAgo(20),
        title: "Client MSA v1",
      },
      {
        id: "v8",
        docId: "d4",
        versionNumber: 2,
        createdAt: isoDaysAgo(2),
        title: "Client MSA v2",
      },
    ],
  },
];