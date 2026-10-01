import {
  ContributionEntry,
  ContributionPool,
  ContributionWithdrawRequest,
} from "../types/contributions";
import { DuesPeriod, LedgerEntry, LedgerType } from "../types/finance";
import { ReportData, ReportSection } from "../types/reports";
import { User } from "../types/user";
import {
  chargeStatusLabel,
  getChargeDisplayStatus,
} from "./financeChargeStatus";
import { formatCurrency } from "./formatCurrency";
import { formatDisplayDate } from "./formatDate";
import { getChargeAmountPaid, getChargeOutstanding } from "./financeTotals";

const shortUid = (uid: string) =>
  uid.length > 8 ? `${uid.slice(0, 4)}...${uid.slice(-4)}` : uid;

const buildMemberResolvers = (members: User[]) => {
  const byUid = new Map(members.map((member) => [member.uid, member]));
  const resolveName = (uid: string) =>
    byUid.get(uid)?.fullName ?? `Archived · ${shortUid(uid)}`;
  const resolveEmail = (uid: string) => byUid.get(uid)?.email ?? "";
  return { byUid, resolveEmail, resolveName };
};

const inDateRange = (
  date: Date | null,
  startDate?: Date,
  endDate?: Date,
): boolean => {
  if (!date) {
    return !startDate && !endDate;
  }
  if (startDate && date < startDate) {
    return false;
  }
  if (endDate && date > endDate) {
    return false;
  }
  return true;
};

const dateLabel = (date: Date | null) => (date ? formatDisplayDate(date) : "");

export interface DuesReportFilters {
  duesPeriodId?: string;
}

export const buildDuesReportData = (
  ledgerEntries: LedgerEntry[],
  duesPeriods: DuesPeriod[],
  members: User[],
  filters: DuesReportFilters = {},
): ReportData => {
  const { resolveEmail, resolveName } = buildMemberResolvers(members);
  const period = filters.duesPeriodId
    ? duesPeriods.find((item) => item.id === filters.duesPeriodId)
    : undefined;

  const charges = ledgerEntries.filter(
    (entry) =>
      entry.type === "dues" &&
      (!filters.duesPeriodId || entry.duesPeriodId === filters.duesPeriodId),
  );

  const rows = charges
    .map((entry) => {
      const chargePeriod = duesPeriods.find(
        (item) => item.id === entry.duesPeriodId,
      );
      const amountPaid = getChargeAmountPaid(entry);
      const outstanding = getChargeOutstanding(entry);
      return {
        amountPaid,
        outstanding,
        row: [
          resolveName(entry.uid),
          resolveEmail(entry.uid),
          chargePeriod?.name ?? entry.label,
          entry.amount,
          amountPaid,
          outstanding,
          chargeStatusLabel(getChargeDisplayStatus(entry)),
          dateLabel(entry.dueDate),
        ],
        totalCharged: entry.amount,
      };
    })
    .sort((left, right) => String(left.row[0]).localeCompare(String(right.row[0])));

  const totalCharged = rows.reduce((sum, item) => sum + item.totalCharged, 0);
  const totalPaid = rows.reduce((sum, item) => sum + item.amountPaid, 0);
  const totalOutstanding = rows.reduce((sum, item) => sum + item.outstanding, 0);

  return {
    generatedAt: new Date(),
    sections: [
      {
        columns: [
          "Member",
          "Email",
          "Dues Period",
          "Amount Charged",
          "Amount Paid",
          "Outstanding",
          "Status",
          "Due Date",
        ],
        rows: rows.map((item) => item.row),
      },
    ],
    subtitle: period ? period.name : "All dues periods",
    summary: [
      { label: "Total charged", value: formatCurrency(totalCharged) },
      { label: "Total collected", value: formatCurrency(totalPaid) },
      { label: "Total outstanding", value: formatCurrency(totalOutstanding) },
      { label: "Charges", value: String(rows.length) },
    ],
    title: "Dues Report",
  };
};

export interface LedgerReportFilters {
  startDate?: Date;
  endDate?: Date;
  types?: LedgerType[];
  includeArchived?: boolean;
}

export const buildLedgerReportData = (
  ledgerEntries: LedgerEntry[],
  members: User[],
  filters: LedgerReportFilters = {},
): ReportData => {
  const { byUid, resolveEmail, resolveName } = buildMemberResolvers(members);
  const filtered = ledgerEntries.filter((entry) => {
    if (filters.types && filters.types.length > 0 && !filters.types.includes(entry.type)) {
      return false;
    }
    if (!filters.includeArchived && !byUid.has(entry.uid)) {
      return false;
    }
    const anchorDate = entry.paidAt ?? entry.dueDate;
    return inDateRange(anchorDate, filters.startDate, filters.endDate);
  });

  const rows = filtered
    .map((entry) => {
      const amountPaid = getChargeAmountPaid(entry);
      const outstanding = getChargeOutstanding(entry);
      return {
        amount: entry.amount,
        amountPaid,
        outstanding,
        row: [
          resolveName(entry.uid),
          resolveEmail(entry.uid),
          entry.type === "payment" ? "Payment" : "Charge",
          entry.type,
          entry.label,
          entry.amount,
          amountPaid,
          outstanding,
          chargeStatusLabel(getChargeDisplayStatus(entry)),
          dateLabel(entry.dueDate),
          dateLabel(entry.paidAt),
          entry.recordedByName ?? entry.recordedByEmail ?? "",
        ],
      };
    })
    .sort((left, right) => String(left.row[0]).localeCompare(String(right.row[0])));

  const charges = filtered.filter((entry) => entry.type !== "payment");
  const totalCharged = charges.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = charges.reduce(
    (sum, entry) => sum + getChargeAmountPaid(entry),
    0,
  );
  const totalOutstanding = charges.reduce(
    (sum, entry) => sum + getChargeOutstanding(entry),
    0,
  );

  return {
    generatedAt: new Date(),
    sections: [
      {
        columns: [
          "Member",
          "Email",
          "Direction",
          "Type",
          "Label",
          "Amount",
          "Amount Paid",
          "Outstanding",
          "Status",
          "Due Date",
          "Paid Date",
          "Recorded By",
        ],
        rows: rows.map((item) => item.row),
      },
    ],
    subtitle:
      filters.startDate || filters.endDate
        ? `${filters.startDate ? formatDisplayDate(filters.startDate) : "Start"} – ${
            filters.endDate ? formatDisplayDate(filters.endDate) : "Now"
          }`
        : "All time",
    summary: [
      { label: "Total charged", value: formatCurrency(totalCharged) },
      { label: "Total collected", value: formatCurrency(totalPaid) },
      { label: "Total outstanding", value: formatCurrency(totalOutstanding) },
      { label: "Entries", value: String(rows.length) },
    ],
    title: "Full Ledger Export",
  };
};

export interface ContributionsReportFilters {
  poolId?: string;
  includeWithdrawRequests?: boolean;
}

export const buildContributionsReportData = (
  entries: ContributionEntry[],
  pools: ContributionPool[],
  withdrawRequests: ContributionWithdrawRequest[],
  members: User[],
  filters: ContributionsReportFilters = {},
): ReportData => {
  const { resolveEmail, resolveName } = buildMemberResolvers(members);
  const pool = filters.poolId
    ? pools.find((item) => item.id === filters.poolId)
    : undefined;

  const scopedEntries = entries.filter(
    (entry) => !filters.poolId || entry.poolId === filters.poolId,
  );

  const totalsByUid = new Map<
    string,
    { contributed: number; withdrawn: number }
  >();
  scopedEntries.forEach((entry) => {
    const current = totalsByUid.get(entry.uid) ?? {
      contributed: 0,
      withdrawn: 0,
    };
    if (entry.type === "contribution") {
      current.contributed += entry.amount;
    } else {
      current.withdrawn += entry.amount;
    }
    totalsByUid.set(entry.uid, current);
  });

  const poolNameFor = (poolId: string) =>
    pools.find((item) => item.id === poolId)?.name ?? poolId;

  const memberRows = Array.from(totalsByUid.entries())
    .map(([uid, totals]) => [
      resolveName(uid),
      resolveEmail(uid),
      pool ? pool.name : "All pools",
      totals.contributed,
      totals.withdrawn,
      Math.max(0, totals.contributed - totals.withdrawn),
    ])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])));

  const totalContributed = scopedEntries
    .filter((entry) => entry.type === "contribution")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const totalWithdrawn = scopedEntries
    .filter((entry) => entry.type === "payout")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const sections: ReportSection[] = [
    {
      columns: [
        "Member",
        "Email",
        "Pool",
        "Contributed",
        "Withdrawn",
        "Available",
      ],
      rows: memberRows,
    },
  ];

  if (filters.includeWithdrawRequests) {
    const scopedRequests = withdrawRequests.filter(
      (request) => !filters.poolId || request.poolId === filters.poolId,
    );
    sections.push({
      columns: [
        "Member",
        "Pool",
        "Amount",
        "Status",
        "Reason",
        "Requested",
        "Reviewed By",
        "Paid",
      ],
      rows: scopedRequests
        .map((request) => [
          resolveName(request.uid),
          poolNameFor(request.poolId),
          request.amount,
          request.status.toUpperCase(),
          request.reason,
          dateLabel(request.createdAt),
          request.reviewedByName ?? "",
          dateLabel(request.paidAt),
        ])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
      title: "Withdrawal Requests",
    });
  }

  return {
    generatedAt: new Date(),
    sections,
    subtitle: pool ? pool.name : "All contribution pools",
    summary: [
      { label: "Total contributed", value: formatCurrency(totalContributed) },
      { label: "Total withdrawn", value: formatCurrency(totalWithdrawn) },
      {
        label: "Pool balance",
        value: formatCurrency(Math.max(0, totalContributed - totalWithdrawn)),
      },
      { label: "Contributors", value: String(memberRows.length) },
    ],
    title: "Contributions Report",
  };
};

export interface StatementReportFilters {
  startDate?: Date;
  endDate?: Date;
}

export const buildMemberStatementData = (
  ledgerEntries: LedgerEntry[],
  contributionEntries: ContributionEntry[],
  member: User,
  filters: StatementReportFilters = {},
): ReportData => {
  const memberLedger = ledgerEntries
    .filter((entry) => entry.uid === member.uid)
    .filter((entry) =>
      inDateRange(entry.paidAt ?? entry.dueDate, filters.startDate, filters.endDate),
    )
    .sort((left, right) => {
      const leftDate = (left.paidAt ?? left.dueDate)?.getTime() ?? 0;
      const rightDate = (right.paidAt ?? right.dueDate)?.getTime() ?? 0;
      return rightDate - leftDate;
    });

  const memberContributions = contributionEntries
    .filter((entry) => entry.uid === member.uid)
    .filter((entry) =>
      inDateRange(entry.paidAt ?? entry.createdAt, filters.startDate, filters.endDate),
    )
    .sort((left, right) => {
      const leftDate = (left.paidAt ?? left.createdAt)?.getTime() ?? 0;
      const rightDate = (right.paidAt ?? right.createdAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    });

  const charges = memberLedger.filter((entry) => entry.type !== "payment");
  const totalCharged = charges.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPaid = charges.reduce(
    (sum, entry) => sum + getChargeAmountPaid(entry),
    0,
  );
  const totalOutstanding = charges.reduce(
    (sum, entry) => sum + getChargeOutstanding(entry),
    0,
  );
  const totalContributed = memberContributions
    .filter((entry) => entry.type === "contribution")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    generatedAt: new Date(),
    sections: [
      {
        columns: [
          "Type",
          "Label",
          "Amount",
          "Amount Paid",
          "Outstanding",
          "Status",
          "Due Date",
          "Paid Date",
        ],
        rows: memberLedger.map((entry) => [
          entry.type === "payment" ? "Payment" : entry.type,
          entry.label,
          entry.amount,
          getChargeAmountPaid(entry),
          getChargeOutstanding(entry),
          chargeStatusLabel(getChargeDisplayStatus(entry)),
          dateLabel(entry.dueDate),
          dateLabel(entry.paidAt),
        ]),
        title: "Dues & Charges",
      },
      {
        columns: ["Type", "Label", "Amount", "Date"],
        rows: memberContributions.map((entry) => [
          entry.type === "contribution" ? "Contribution" : "Payout",
          entry.label,
          entry.amount,
          dateLabel(entry.paidAt ?? entry.createdAt),
        ]),
        title: "Contributions",
      },
    ],
    subtitle: `${member.fullName} · ${member.email}`,
    summary: [
      { label: "Total charged", value: formatCurrency(totalCharged) },
      { label: "Total paid", value: formatCurrency(totalPaid) },
      { label: "Outstanding", value: formatCurrency(totalOutstanding) },
      { label: "Total contributed", value: formatCurrency(totalContributed) },
    ],
    title: "Member Statement",
  };
};
