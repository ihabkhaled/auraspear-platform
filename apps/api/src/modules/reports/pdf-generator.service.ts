import { Injectable, Logger } from '@nestjs/common'
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
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import type { GeneratedReportContent } from './reports.types'

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name)

  constructor(private readonly appLogger: AppLoggerService) {}

  /**
   * Generates a professional PDF from a structured report content object.
   * Returns a Buffer containing the PDF bytes.
   */
  async generateReportPdf(content: GeneratedReportContent): Promise<Buffer> {
    this.appLogger.info('PDF generation started', {
      feature: AppLogFeature.REPORTS,
      action: 'generateReportPdf',
      outcome: AppLogOutcome.PENDING,
      tenantId: content.tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'PdfGeneratorService',
      functionName: 'generateReportPdf',
      metadata: { reportId: content.reportId, reportName: content.reportName },
    })

    try {
      const buffer = await this.buildPdfBuffer(content)

      this.appLogger.info('PDF generation completed', {
        feature: AppLogFeature.REPORTS,
        action: 'generateReportPdf',
        outcome: AppLogOutcome.SUCCESS,
        tenantId: content.tenantId,
        sourceType: AppLogSourceType.SERVICE,
        className: 'PdfGeneratorService',
        functionName: 'generateReportPdf',
        metadata: {
          reportId: content.reportId,
          reportName: content.reportName,
          sizeBytes: buffer.length,
        },
      })

      return buffer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`PDF generation failed: ${errorMessage}`)

      this.appLogger.error('PDF generation failed', {
        feature: AppLogFeature.REPORTS,
        action: 'generateReportPdf',
        outcome: AppLogOutcome.FAILURE,
        tenantId: content.tenantId,
        sourceType: AppLogSourceType.SERVICE,
        className: 'PdfGeneratorService',
        functionName: 'generateReportPdf',
        metadata: {
          reportId: content.reportId,
          reportName: content.reportName,
          error: errorMessage,
        },
      })

      throw error
    }
  }

  private buildPdfBuffer(content: GeneratedReportContent): Promise<Buffer> {
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

      this.renderHeader(document, content)
      this.renderSections(document, content)
      this.renderFooter(document, content)

      document.end()
    })
  }

  private renderHeader(document: PDFKit.PDFDocument, content: GeneratedReportContent): void {
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
  }

  private renderSections(document: PDFKit.PDFDocument, content: GeneratedReportContent): void {
    for (const section of content.sections) {
      this.renderSection(document, section)
    }
  }

  private renderSection(
    document: PDFKit.PDFDocument,
    section: GeneratedReportContent['sections'][number]
  ): void {
    if (document.y > document.page.height - 150) {
      document.addPage()
    }

    document.fontSize(PDF_FONT_SIZE_HEADING).fillColor(PDF_COLOR_PRIMARY).text(section.title)

    if (section.description) {
      document.moveDown(0.2)
      document.fontSize(PDF_FONT_SIZE_BODY).fillColor(PDF_COLOR_BODY).text(section.description)
    }

    document.moveDown(0.5)

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

    if (section.tables) {
      for (const table of section.tables) {
        this.renderTable(document, table)
      }
    }

    document.moveDown(1)
  }

  private renderTable(
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

    let currentY = this.renderTableHeader(document, table.columns, colCount, colWidth)
    currentY = this.renderTableRows(document, table, colCount, colWidth, currentY)

    document.y = currentY + 10
  }

  private renderTableHeader(
    document: PDFKit.PDFDocument,
    columns: string[],
    colCount: number,
    colWidth: number
  ): number {
    const startX = PDF_MARGIN
    const currentY = document.y
    const pageWidth = document.page.width - PDF_MARGIN * 2

    document
      .rect(startX, currentY, Math.min(colWidth * colCount, pageWidth), 18)
      .fill(PDF_COLOR_TABLE_HEADER_BG)

    document.fillColor(PDF_COLOR_HEADING).fontSize(PDF_FONT_SIZE_SMALL)

    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const col = columns.at(colIndex)
      if (col) {
        document.text(col, startX + colIndex * colWidth + 4, currentY + 4, {
          width: colWidth - 8,
          height: 14,
          ellipsis: true,
        })
      }
    }

    return currentY + 20
  }

  private renderTableRows(
    document: PDFKit.PDFDocument,
    table: { columns: string[]; rows: Record<string, unknown>[] },
    colCount: number,
    colWidth: number,
    startY: number
  ): number {
    const startX = PDF_MARGIN
    let currentY = startY

    document.fillColor(PDF_COLOR_BODY).fontSize(PDF_FONT_SIZE_SMALL)

    const maxRows = Math.min(table.rows.length, PDF_MAX_TABLE_ROWS)
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      if (currentY > document.page.height - 60) {
        document.addPage()
        currentY = PDF_MARGIN
      }

      const row = table.rows.at(rowIndex)
      if (row) {
        this.renderTableRowCells(document, row, table.columns, colCount, colWidth, currentY)
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

    return currentY
  }

  private renderTableRowCells(
    document: PDFKit.PDFDocument,
    row: Record<string, unknown>,
    columns: string[],
    colCount: number,
    colWidth: number,
    y: number
  ): void {
    const startX = PDF_MARGIN
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const col = columns.at(colIndex)
      if (col) {
        const cellValue = String(Reflect.get(row, col) ?? '')
        document.text(cellValue, startX + colIndex * colWidth + 4, y + 2, {
          width: colWidth - 8,
          height: 14,
          ellipsis: true,
        })
      }
    }
  }

  private renderFooter(document: PDFKit.PDFDocument, content: GeneratedReportContent): void {
    document
      .fontSize(PDF_FONT_SIZE_SMALL)
      .fillColor(PDF_COLOR_MUTED)
      .text(
        `Report ID: ${content.reportId} | Tenant: ${content.tenantId}`,
        PDF_MARGIN,
        document.page.height - 30,
        { align: 'center', width: document.page.width - PDF_MARGIN * 2 }
      )
  }
}
