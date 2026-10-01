import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ReportData, ReportFormat } from "../types/reports";

const escapeCsvCell = (value: string | number): string => {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export const toCsv = (data: ReportData): string => {
  const lines: string[] = [
    escapeCsvCell(data.title),
    escapeCsvCell(data.subtitle),
    `Generated ${data.generatedAt.toLocaleString()}`,
  ];
  if (data.summary.length > 0) {
    lines.push("");
    data.summary.forEach((item) => {
      lines.push(`${escapeCsvCell(item.label)},${escapeCsvCell(item.value)}`);
    });
  }
  data.sections.forEach((section) => {
    lines.push("");
    if (section.title) {
      lines.push(escapeCsvCell(section.title));
    }
    lines.push(section.columns.map(escapeCsvCell).join(","));
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCsvCell).join(","));
    });
  });
  return lines.join("\n");
};

const escapeHtml = (value: string | number): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const toReportHtml = (data: ReportData): string => {
  const summaryHtml = data.summary
    .map(
      (item) =>
        `<div class="stat"><span class="stat-label">${escapeHtml(item.label)}</span><span class="stat-value">${escapeHtml(item.value)}</span></div>`,
    )
    .join("");

  const sectionsHtml = data.sections
    .map(
      (section) => `
      ${section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ""}
      <table>
        <thead><tr>${section.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("")}</tr></thead>
        <tbody>
          ${
            section.rows.length > 0
              ? section.rows
                  .map(
                    (row) =>
                      `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
                  )
                  .join("")
              : `<tr><td class="empty" colspan="${section.columns.length}">No records</td></tr>`
          }
        </tbody>
      </table>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; }
        h1 { color: #a67c1a; margin-bottom: 4px; }
        .subtitle { color: #666; margin-top: 0; margin-bottom: 4px; }
        .generated { color: #999; font-size: 12px; margin-bottom: 20px; }
        .summary { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
        .stat { flex: 1 1 160px; border: 1px solid #e0d3ae; border-radius: 8px; padding: 12px; background: #fdf8ec; }
        .stat-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #8a6d1f; }
        .stat-value { display: block; font-size: 18px; font-weight: 700; color: #1a1a1a; }
        h2 { color: #a67c1a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        th { background: #f6efdb; color: #6b5312; font-weight: 700; }
        tr:nth-child(even) td { background: #fafafa; }
        .empty { text-align: center; color: #999; padding: 16px; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(data.title)}</h1>
      <p class="subtitle">${escapeHtml(data.subtitle)}</p>
      <p class="generated">Generated ${data.generatedAt.toLocaleString()}</p>
      <div class="summary">${summaryHtml}</div>
      ${sectionsHtml}
    </body>
  </html>`;
};

const shareFile = async (
  uri: string,
  mimeType: string,
  dialogTitle: string,
  uti: string,
) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, { dialogTitle, mimeType, UTI: uti });
};

export const exportReport = async (
  data: ReportData,
  format: ReportFormat,
  fileNameBase: string,
): Promise<void> => {
  if (format === "pdf") {
    const { uri } = await Print.printToFileAsync({
      html: toReportHtml(data),
    });
    const cacheDirectory = FileSystem.cacheDirectory;
    if (!cacheDirectory) {
      throw new Error("No writable directory available on this device.");
    }
    const namedUri = `${cacheDirectory}${fileNameBase}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: namedUri });
    await shareFile(
      namedUri,
      "application/pdf",
      data.title,
      "com.adobe.pdf",
    );
    return;
  }

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error("No writable directory available on this device.");
  }
  const fileUri = `${cacheDirectory}${fileNameBase}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, toCsv(data));
  await shareFile(
    fileUri,
    "text/csv",
    data.title,
    "public.comma-separated-values-text",
  );
};
