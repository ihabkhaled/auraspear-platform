'use client'

import { ExternalLink, Loader2, RefreshCw, Upload } from 'lucide-react'
import { OsintResultCard } from '@/components/common/OsintResultCard'
import { Button } from '@/components/ui'
import { useOsintFileUpload } from '@/hooks'
import type { OsintFileUploadButtonProps } from '@/types'

export function OsintFileUploadButton({ t }: OsintFileUploadButtonProps) {
  const {
    fileInputRef,
    handleButtonClick,
    handleFileChange,
    isUploading,
    result,
    clearResult,
    fetchedData,
    isFetchingAnalysis,
    fetchAnalysis,
    isQueued,
    fetchUrl,
    fetchedStillQueued,
    showFetchButton,
    vtFileGuiUrl,
  } = useOsintFileUpload()

  return (
    <div className="inline-flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-xs"
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Upload className="mr-1 h-3 w-3" />
        )}
        {isUploading ? t('uploadingFile') : t('uploadFile')}
      </Button>

      {result && (
        <div className="bg-card border-border mt-1 flex max-h-96 max-w-sm flex-col rounded border p-2">
          {isQueued && fetchedData === null && (
            <div className="mb-2 space-y-1">
              <p className="text-status-info text-xs font-medium">{t('analysisQueued')}</p>
              <p className="text-muted-foreground text-[10px]">{t('analysisQueuedHint')}</p>
            </div>
          )}

          {fetchedData !== null && fetchedStillQueued && (
            <p className="text-status-warning mb-2 text-[10px]">{t('analysisQueuedHint')}</p>
          )}

          {fetchedData !== null && !fetchedStillQueued && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OsintResultCard
                result={{ ...result, data: fetchedData, rawResponse: fetchedData }}
                t={t}
              />
            </div>
          )}

          {!showFetchButton && fetchedData === null && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OsintResultCard result={result} t={t} />
            </div>
          )}

          <div className="border-border flex flex-wrap items-center gap-2 border-t pt-2">
            {showFetchButton && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                disabled={isFetchingAnalysis}
                onClick={() => {
                  if (fetchUrl && result.sourceId) {
                    void fetchAnalysis(fetchUrl, result.sourceId)
                  }
                }}
              >
                {isFetchingAnalysis ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                {isFetchingAnalysis ? t('fetchingResults') : t('fetchAnalysisResults')}
              </Button>
            )}

            {vtFileGuiUrl && (
              <a
                href={vtFileGuiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-status-info inline-flex items-center gap-1 text-[10px] hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {t('viewOnVirusTotal')}
              </a>
            )}

            <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={clearResult}>
              {t('osintDismiss')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
