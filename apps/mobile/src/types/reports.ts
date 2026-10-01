export type ReportType = "dues" | "ledger" | "contributions" | "statement";
export type ReportFormat = "csv" | "pdf";

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export interface ReportSection {
  title?: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface ReportData {
  title: string;
  subtitle: string;
  generatedAt: Date;
  summary: ReportSummaryItem[];
  sections: ReportSection[];
}
