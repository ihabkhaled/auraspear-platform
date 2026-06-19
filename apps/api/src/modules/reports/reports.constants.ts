/** Default number of days to look back for report data when no date range is specified */
export const REPORT_DEFAULT_LOOKBACK_DAYS = 30

/** Maximum number of top items to include in report tables */
export const REPORT_TOP_ITEMS_LIMIT = 10

/** Maximum number of trend data points to include in reports */
export const REPORT_TREND_DAYS = 30

/** CSV delimiter */
export const REPORT_CSV_DELIMITER = ','

/** CSV newline character */
export const REPORT_CSV_NEWLINE = '\n'

/* ---------------------------------------------------------------- */
/* PDF GENERATION CONSTANTS                                          */
/* ---------------------------------------------------------------- */

export const PDF_FONT_SIZE_TITLE = 20
export const PDF_FONT_SIZE_HEADING = 14
export const PDF_FONT_SIZE_BODY = 10
export const PDF_FONT_SIZE_SMALL = 8
export const PDF_COLOR_PRIMARY = '#135bec'
export const PDF_COLOR_HEADING = '#1a1a2e'
export const PDF_COLOR_BODY = '#333333'
export const PDF_COLOR_MUTED = '#666666'
export const PDF_COLOR_TABLE_HEADER_BG = '#f0f0f5'
export const PDF_MARGIN = 50
export const PDF_TABLE_COL_MIN_WIDTH = 80
export const PDF_MAX_TABLE_ROWS = 50

export const AI_REPORT_SERVICE_CLASS_NAME = 'AiReportService'
export const AI_REPORT_TIME_RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
}

export const REPORT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  generatedAt: 'generatedAt',
  module: 'module',
  name: 'name',
  type: 'type',
  status: 'status',
  format: 'format',
}
