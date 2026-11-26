import type { AnalysisReport } from './types';

export const SHEET_TAB_TITLE = 'Analysis Log';

export const SHEET_HEADERS = [
  'Analyzed At (UTC)',
  'User Email',
  'Engine Mode',
  'Input Type',
  'Applied Input (Redacted)',
  'Risk Level',
  'Scam Category',
  'Response Message (Summary)',
  'Evidence Signals',
  'Recommended Next Steps',
  'Verification Guidance',
  'Research Sources',
] as const;

export const APPS_SCRIPT_CENTRAL_SHEET_SNIPPET = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  if (data.eventType === 'threat_alert' && data.recipientEmail && data.emailBody) {
    MailApp.sendEmail({
      to: data.recipientEmail,
      subject: data.subject || 'SignalSure Threat Alert',
      body: data.emailBody
    });
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, emailed: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Analysis Log') || ss.insertSheet('Analysis Log');
  if (sheet.getLastRow() === 0 && data.headers) {
    sheet.appendRow(data.headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, data.headers.length).setFontWeight('bold');
  }
  if (data.row) {
    sheet.appendRow(data.row);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export interface ConnectedSheetTarget {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  tabTitle: string;
}

export class SheetsAuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SheetsAuthError';
    this.status = status;
  }
}

export function escapeSheetCellValue(rawValue: string): string {
  const cleaned = rawValue.replace(/\r?\n/g, ' ').trim();
  if (!cleaned) return '';
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

export function redactFullInputForSheet(rawText: string, maxLength = 1200): string {
  const normalized = rawText
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/g, '[REDACTED-CARD]')
    .replace(
      /\b(otp|pin|upi\s*pin|cvv|password|mpin)\s*(?:is|:|=)\s*[a-z0-9*#-]{3,12}\b/gi,
      '$1: [REDACTED]'
    )
    .trim();

  if (!normalized) return 'Submitted excerpt';
  const clipped =
    normalized.length <= maxLength
      ? normalized
      : `${normalized.slice(0, maxLength - 1)}…`;
  return escapeSheetCellValue(clipped);
}

export function extractSpreadsheetId(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,120})/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{15,120}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function buildOrganizedSheetRow(params: {
  rawInput: string;
  userEmail?: string | null;
  report: AnalysisReport;
}): string[] {
  const { rawInput, userEmail, report } = params;

  const normalizedEmail = (userEmail || '').trim();
  const safeEmail = normalizedEmail
    ? escapeSheetCellValue(normalizedEmail.slice(0, 200))
    : 'Not signed in';

  const modeLabel =
    report.mode === 'live' ? 'Live AI + Web Research' : 'Demo Mode (Rule-Based)';

  const evidenceSummary =
    report.observedEvidence.length > 0
      ? report.observedEvidence
          .map(
            (item) =>
              `[${item.severity.toUpperCase()}] ${item.indicatorType}: "${item.quotedPhrase}" — ${item.whyItMatters}`
          )
          .join(' | ')
      : 'No high-confidence scam phrases detected';

  const nextStepsText =
    report.recommendedNextSteps.length > 0
      ? report.recommendedNextSteps
          .map((step, index) => `${index + 1}. ${step}`)
          .join(' | ')
      : 'Verify via official website or app.';

  const sourcesText =
    report.researchSources && report.researchSources.length > 0
      ? report.researchSources
          .map((src) => `${src.title} (${src.url})`)
          .join(' | ')
      : 'None matched';

  return [
    escapeSheetCellValue(report.analyzedAt || new Date().toISOString()),
    safeEmail,
    modeLabel,
    report.inputKind === 'url' ? 'URL' : 'MESSAGE',
    redactFullInputForSheet(rawInput),
    report.riskLevel,
    escapeSheetCellValue(report.category),
    escapeSheetCellValue(report.summary.slice(0, 1500)),
    escapeSheetCellValue(evidenceSummary.slice(0, 1800)),
    escapeSheetCellValue(nextStepsText.slice(0, 1500)),
    escapeSheetCellValue(report.verificationGuidance.slice(0, 1000)),
    escapeSheetCellValue(sourcesText.slice(0, 1000)),
  ];
}

export function buildAnalysisLogPayload(params: {
  rawInput: string;
  userEmail?: string | null;
  report: AnalysisReport;
}) {
  const row = buildOrganizedSheetRow(params);
  return {
    eventType: 'analysis_result' as const,
    analyzedAt: row[0],
    userEmail: row[1],
    mode: params.report.mode,
    inputKind: params.report.inputKind,
    appliedInput: row[4],
    riskLevel: params.report.riskLevel,
    category: params.report.category,
    responseMessage: row[7],
    evidenceSignals: row[8],
    recommendedNextSteps: row[9],
    verificationGuidance: row[10],
    researchSources: row[11],
    headers: [...SHEET_HEADERS],
    row,
  };
}

function buildSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`;
}

async function parseGoogleErrorMessage(res: Response): Promise<string> {
  const payload = (await res.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return payload?.error?.message || `Google Sheets API error (${res.status}).`;
}

async function sheetsFetch(
  url: string,
  accessToken: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    const message = await parseGoogleErrorMessage(res);
    throw new SheetsAuthError(
      `Google Sheets permission expired or missing (${message}). Sign in with Google again to reconnect.`,
      res.status
    );
  }

  if (!res.ok) {
    throw new Error(await parseGoogleErrorMessage(res));
  }

  return res;
}

async function formatHeaderAndColumns(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number
): Promise<void> {
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: { frozenRowCount: 1 },
              },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: SHEET_HEADERS.length,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.03, green: 0.1, blue: 0.1 },
                  textFormat: {
                    foregroundColor: { red: 0.0, green: 0.94, blue: 0.78 },
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'LEFT',
                  verticalAlignment: 'MIDDLE',
                },
              },
              fields:
                'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: SHEET_HEADERS.length,
              },
            },
          },
        ],
      }),
    }
  );
}

export async function createOrganizedSignalSureSheet(
  accessToken: string,
  initialRow?: string[]
): Promise<ConnectedSheetTarget> {
  const createRes = await sheetsFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: 'SignalSure Analysis Log',
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: SHEET_TAB_TITLE,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    }
  );

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };

  const spreadsheetId = created.spreadsheetId;
  const tabTitle = created.sheets?.[0]?.properties?.title || SHEET_TAB_TITLE;
  const sheetId = created.sheets?.[0]?.properties?.sheetId ?? 0;

  const rowsToWrite: string[][] = initialRow
    ? [[...SHEET_HEADERS], initialRow]
    : [[...SHEET_HEADERS]];

  const range = `${tabTitle}!A1:L${rowsToWrite.length}`;
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rowsToWrite,
      }),
    }
  );

  await formatHeaderAndColumns(accessToken, spreadsheetId, sheetId);

  return {
    spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl || buildSpreadsheetUrl(spreadsheetId),
    title: created.properties?.title || 'SignalSure Analysis Log',
    tabTitle,
  };
}

export async function appendRowToSignalSureSheet(
  accessToken: string,
  spreadsheetId: string,
  row: string[]
): Promise<ConnectedSheetTarget> {
  // Always inspect spreadsheet metadata first instead of hardcoding tab names.
  const metaRes = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=properties.title,spreadsheetUrl,sheets(properties(sheetId,title))`,
    accessToken,
    { method: 'GET' }
  );

  const meta = (await metaRes.json()) as {
    spreadsheetUrl?: string;
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };

  const sheets = meta.sheets || [];
  if (sheets.length === 0 || !sheets[0].properties?.title) {
    throw new Error('Could not find any sheet tabs in that Google Sheet.');
  }

  const preferred =
    sheets.find((s) => s.properties?.title === SHEET_TAB_TITLE) || sheets[0];
  const tabTitle = preferred.properties!.title!;
  const sheetId = preferred.properties!.sheetId ?? 0;

  // Check if header row exists in A1:L1; write & format organized headers if blank.
  const headerRange = `${tabTitle}!A1:L1`;
  const headerCheckRes = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(headerRange)}`,
    accessToken,
    { method: 'GET' }
  );
  const headerCheck = (await headerCheckRes.json()) as {
    values?: string[][];
  };
  const hasExistingHeader =
    Array.isArray(headerCheck.values) &&
    headerCheck.values.length > 0 &&
    headerCheck.values[0].some((cell) => Boolean(String(cell || '').trim()));

  if (!hasExistingHeader) {
    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(headerRange)}?valueInputOption=USER_ENTERED`,
      accessToken,
      {
        method: 'PUT',
        body: JSON.stringify({
          range: headerRange,
          majorDimension: 'ROWS',
          values: [[...SHEET_HEADERS]],
        }),
      }
    );
    await formatHeaderAndColumns(accessToken, spreadsheetId, sheetId);
  }

  const appendRange = `${tabTitle}!A:L`;
  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(
      appendRange
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        range: appendRange,
        majorDimension: 'ROWS',
        values: [row],
      }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: meta.spreadsheetUrl || buildSpreadsheetUrl(spreadsheetId),
    title: meta.properties?.title || 'Connected Google Sheet',
    tabTitle,
  };
}
