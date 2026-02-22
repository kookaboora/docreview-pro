export type DocSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type DocContent = {
  versionId: string;
  sections: DocSection[];
};

const contractV1: DocContent = {
  versionId: "v1",
  sections: [
    {
      id: "s1",
      title: "1. Parties",
      paragraphs: [
        "This Agreement is made between the Company and the Contractor. The Contractor will provide services as described in this Agreement.",
        "The Company may request additional reasonable information required for onboarding and compliance purposes.",
      ],
    },
    {
      id: "s2",
      title: "2. Services",
      paragraphs: [
        "The Contractor will provide frontend development services including implementation, testing, and UI maintenance.",
        "Deliverables will be agreed in writing. Changes may affect timelines.",
      ],
    },
    {
      id: "s3",
      title: "3. Confidentiality",
      paragraphs: [
        "The Contractor shall keep confidential all non-public information obtained during the engagement.",
        "Confidentiality obligations survive termination for a period of two (2) years.",
      ],
    },
    {
      id: "s4",
      title: "4. Payment",
      paragraphs: [
        "Fees will be paid monthly upon invoice. The invoice must include sufficient detail of work performed.",
        "Late payments may incur reasonable administrative fees.",
      ],
    },
  ],
};

const contractV2: DocContent = {
  versionId: "v2",
  sections: [
    {
      id: "s1",
      title: "1. Parties",
      paragraphs: [
        "This Agreement is made between the Company and the Contractor. The Contractor will provide services described in this Agreement.",
        "The Contractor must provide onboarding documentation required for HR and compliance (as applicable in the engagement jurisdiction).",
      ],
    },
    {
      id: "s2",
      title: "2. Services",
      paragraphs: [
        "The Contractor will provide frontend engineering services including implementation, testing, performance optimization, and UI maintenance.",
        "Deliverables will be agreed in writing. Material changes may affect scope, cost, and timelines.",
      ],
    },
    {
      id: "s3",
      title: "3. Confidentiality",
      paragraphs: [
        "The Contractor shall keep confidential all non-public information obtained during the engagement.",
        "Confidentiality obligations survive termination for a period of three (3) years.",
      ],
    },
    {
      id: "s4",
      title: "4. Payment",
      paragraphs: [
        "Fees will be paid monthly upon invoice. The invoice must include sufficient detail of work performed and dates.",
        "Late payments may incur reasonable administrative fees. Disputed amounts must be notified within seven (7) days.",
      ],
    },
    {
      id: "s5",
      title: "5. Termination",
      paragraphs: [
        "Either party may terminate with fourteen (14) days written notice. Immediate termination may apply for material breach.",
      ],
    },
  ],
};

// Map docId -> versionId -> content
const store: Record<string, Record<string, DocContent>> = {
  d1: { v1: contractV1, v2: contractV2 },
  d2: {
    v3: {
      versionId: "v3",
      sections: [
        {
          id: "s1",
          title: "1. Vendor Identity",
          paragraphs: [
            "Collect legal name, registration number, and primary business address.",
            "Confirm authorized signatory and contact details.",
          ],
        },
        {
          id: "s2",
          title: "2. Compliance Checks",
          paragraphs: [
            "Verify tax registration and any required certifications.",
            "Record risk rating based on services provided.",
          ],
        },
      ],
    },
    v4: {
      versionId: "v4",
      sections: [
        {
          id: "s1",
          title: "1. Vendor Identity",
          paragraphs: [
            "Collect legal name, registration number, primary business address, and billing email.",
            "Confirm authorized signatory and escalation contact.",
          ],
        },
        {
          id: "s2",
          title: "2. Compliance Checks",
          paragraphs: [
            "Verify tax registration, required certifications, and sanctions screening (where applicable).",
            "Record risk rating based on services and geography.",
          ],
        },
        {
          id: "s3",
          title: "3. Approval",
          paragraphs: [
            "Manager approval required for Medium/High risk vendors.",
            "All approvals must be logged with timestamp and reviewer name.",
          ],
        },
      ],
    },
  },
  d3: {
    v5: {
      versionId: "v5",
      sections: [
        {
          id: "s1",
          title: "Incident Summary",
          paragraphs: ["Describe the incident clearly, including location and immediate impact."],
        },
        {
          id: "s2",
          title: "Immediate Actions",
          paragraphs: ["List actions taken to ensure safety and prevent recurrence."],
        },
      ],
    },
    v6: {
      versionId: "v6",
      sections: [
        {
          id: "s1",
          title: "Incident Summary",
          paragraphs: [
            "Describe the incident clearly, including location, immediate impact, and involved parties.",
          ],
        },
        {
          id: "s2",
          title: "Immediate Actions",
          paragraphs: [
            "List actions taken to ensure safety and prevent recurrence.",
            "Attach any relevant photos or witness statements (if available).",
          ],
        },
      ],
    },
  },
  d4: {
    v7: {
      versionId: "v7",
      sections: [
        {
          id: "s1",
          title: "Scope of Services",
          paragraphs: [
            "Provider will deliver SaaS services as described in the Order Form.",
            "Service availability targets will be defined separately.",
          ],
        },
        {
          id: "s2",
          title: "Fees & Billing",
          paragraphs: ["Fees are billed monthly in arrears unless otherwise agreed."],
        },
      ],
    },
    v8: {
      versionId: "v8",
      sections: [
        {
          id: "s1",
          title: "Scope of Services",
          paragraphs: [
            "Provider will deliver SaaS services as described in the Order Form and Documentation.",
            "Service availability targets and support response times are defined in the SLA.",
          ],
        },
        {
          id: "s2",
          title: "Fees & Billing",
          paragraphs: [
            "Fees are billed monthly in arrears unless otherwise agreed.",
            "Invoices are payable within thirty (30) days unless stated otherwise.",
          ],
        },
        {
          id: "s3",
          title: "Data Processing",
          paragraphs: [
            "Where personal data is processed, the parties will comply with applicable privacy requirements.",
          ],
        },
      ],
    },
  },
};

export function getDocContent(docId: string, versionId: string): DocContent | null {
  return store[docId]?.[versionId] ?? null;
}