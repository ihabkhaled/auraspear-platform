'use client'

import { ChevronDown, Download, Upload } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui'
import { useExportImportSettings } from '@/hooks'

export default function ExportImportCard() {
  const { t, fileInputRef, isPending, handleExport, handleImportClick, handleFileChange } =
    useExportImportSettings()

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {t('exportImportSettings')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{t('exportImportDescription')}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleExport} disabled={isPending}>
                <Download className="me-2 h-4 w-4" />
                {t('exportSettings')}
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={isPending}>
                <Upload className="me-2 h-4 w-4" />
                {t('importSettings')}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              aria-label={t('importSettings')}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
