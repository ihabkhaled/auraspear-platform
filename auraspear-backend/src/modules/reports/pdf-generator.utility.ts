import PDFDocument from 'pdfkit'
import {
  PDF_COLOR_BODY,
  PDF_COLOR_HEADING,
  PDF_COLOR_MUTED,
  PDF_COLOR_PRIMARY,
  PDF_COLOR_TABLE_HEADER_BG,
  PDF_FONT_SIZE_BODY,
  PDF_FONT_SIZE_HEADING,
  PDF_FONT_SIZE_SMALL,
  PDF_FONT_SIZE_TITLE,
  PDF_MARGIN,
  PDF_MAX_TABLE_ROWS,
  PDF_TABLE_COL_MIN_WIDTH,
} from './reports.constants'
import type { GeneratedReportContent } from './reports.types'

/**
 * Generates a professional PDF from a structured report content object.
 * Returns a Buffer containing the PDF bytes.
 */
export function generateReportPdf(content: GeneratedReportContent): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    const document = new PDFDocument({
      size: 'A4',
      margins: { top: PDF_MARGIN, bottom: PDF_MARGIN, left: PDF_MARGIN, right: PDF_MARGIN },
      info: {
        Title: content.reportName,
        Author: 'AuraSpear SOC',
        Subject: content.reportType,
        Creator: 'AuraSpear Report Engine',
      },
    })

    document.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    document.on('end', () => {
      resolve(Buffer.concat(chunks))
    })

    document.on('error', (error: Error) => {
      reject(error)
    })

    // Header
    document
      .fontSize(PDF_FONT_SIZE_TITLE)
      .fillColor(PDF_COLOR_PRIMARY)
      .text('AuraSpear SOC', PDF_MARGIN, PDF_MARGIN, { align: 'left' })

    document.moveDown(0.3)
    document.fontSize(PDF_FONT_SIZE_HEADING).fillColor(PDF_COLOR_HEADING).text(content.reportName)

    document.moveDown(0.3)
    document
      .fontSize(PDF_FONT_SIZE_SMALL)
      .fillColor(PDF_COLOR_MUTED)
      .text(`Type: ${content.reportType} | Module: ${content.module ?? 'General'}`)
      .text(`Date Range: ${content.dateRange.from} — ${content.dateRange.to}`)
      .text(`Generated: ${content.generatedAt}`)

    document
      .moveDown(0.5)
      .moveTo(PDF_MARGIN, document.y)
      .lineTo(document.page.width - PDF_MARGIN, document.y)
      .strokeColor(PDF_COLOR_PRIMARY)
      .lineWidth(1)
      .stroke()

    document.moveDown(1)

    // Sections
    for (const section of content.sections) {
      addSection(document, section)
    }

    // Footer
    document
      .fontSize(PDF_FONT_SIZE_SMALL)
      .fillColor(PDF_COLOR_MUTED)
      .text(
        `Report ID: ${content.reportId} | Tenant: ${content.tenantId}`,
        PDF_MARGIN,
        document.page.height - 30,
        { align: 'center', width: document.page.width - PDF_MARGIN * 2 }
      )

    document.end()
  })
}

function addSection(
  document: PDFKit.PDFDocument,
  section: GeneratedReportContent['sections'][number]
): void {
  // Check if we need a new page
  if (document.y > document.page.height - 150) {
    document.addPage()
  }

  // Section title
  document.fontSize(PDF_FONT_SIZE_HEADING).fillColor(PDF_COLOR_PRIMARY).text(section.title)

  if (section.description) {
    document.moveDown(0.2)
    document.fontSize(PDF_FONT_SIZE_BODY).fillColor(PDF_COLOR_BODY).text(section.description)
  }

  document.moveDown(0.5)

  // Metrics
  if (section.metrics && section.metrics.length > 0) {
    for (const metric of section.metrics) {
      document
        .fontSize(PDF_FONT_SIZE_BODY)
        .fillColor(PDF_COLOR_MUTED)
        .text(`${metric.label}: `, { continued: true })
        .fillColor(PDF_COLOR_HEADING)
        .text(String(metric.value))
    }
    document.moveDown(0.5)
  }

  // Tables
  if (section.tables) {
    for (const table of section.tables) {
      addTable(document, table)
    }
  }

  document.moveDown(1)
}

function addTable(
  document: PDFKit.PDFDocument,
  table: GeneratedReportContent['sections'][number]['tables'] extends (infer T)[] | undefined
    ? T
    : never
): void {
  if (!table?.columns || table.rows.length === 0) {
    return
  }

  if (document.y > document.page.height - 200) {
    document.addPage()
  }

  document.fontSize(PDF_FONT_SIZE_BODY).fillColor(PDF_COLOR_HEADING).text(table.title)

  document.moveDown(0.3)

  const pageWidth = document.page.width - PDF_MARGIN * 2
  const colCount = table.columns.length
  const colWidth = Math.max(pageWidth / colCount, PDF_TABLE_COL_MIN_WIDTH)
  const startX = PDF_MARGIN
  let currentY = document.y

  // Header row
  document
    .rect(startX, currentY, Math.min(colWidth * colCount, pageWidth), 18)
    .fill(PDF_COLOR_TABLE_HEADER_BG)

  document.fillColor(PDF_COLOR_HEADING).fontSize(PDF_FONT_SIZE_SMALL)

  for (let colIndex = 0; colIndex < colCount; colIndex++) {
    const col = table.columns.at(colIndex)
    if (col) {
      document.text(col, startX + colIndex * colWidth + 4, currentY + 4, {
        width: colWidth - 8,
        height: 14,
        ellipsis: true,
      })
    }
  }

  currentY += 20

  // Data rows
  document.fillColor(PDF_COLOR_BODY).fontSize(PDF_FONT_SIZE_SMALL)

  const maxRows = Math.min(table.rows.length, PDF_MAX_TABLE_ROWS)
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    if (currentY > document.page.height - 60) {
      document.addPage()
      currentY = PDF_MARGIN
    }

    const row = table.rows.at(rowIndex)
    if (!row) {
      continue
    }

    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const col = table.columns.at(colIndex)
      if (col) {
        const cellValue = String(Reflect.get(row, col) ?? '')
        document.text(cellValue, startX + colIndex * colWidth + 4, currentY + 2, {
          width: colWidth - 8,
          height: 14,
          ellipsis: true,
        })
      }
    }

    currentY += 16
  }

  if (table.rows.length > maxRows) {
    document
      .fontSize(PDF_FONT_SIZE_SMALL)
      .fillColor(PDF_COLOR_MUTED)
      .text(`... and ${String(table.rows.length - maxRows)} more rows`, startX, currentY + 2)
    currentY += 16
  }

  document.y = currentY + 10
}
