'use client'

import { Copy, ExternalLink, Globe, Plus, Trash2 } from 'lucide-react'
import { OsintEnrichButton, OsintFileUploadButton } from '@/components/common'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { CaseArtifactType } from '@/enums'
import { useCaseArtifactPanel } from '@/hooks'
import { ARTIFACT_TYPE_ICONS, ARTIFACT_TYPE_KEYS } from '@/lib/constants/cases'
import { isFileOrHashType, normalizeIocType } from '@/lib/entity.utils'
import { copyToClipboard, lookup } from '@/lib/utils'
import type { CaseArtifactPanelProps } from '@/types'

export function CaseArtifactPanel({
  artifacts,
  onLookup,
  onAddArtifact,
  onDeleteArtifact,
  addingArtifact,
}: CaseArtifactPanelProps) {
  const {
    t,
    tCommon,
    artifactType,
    setArtifactType,
    artifactValue,
    setArtifactValue,
    artifactSource,
    setArtifactSource,
    groupedArtifacts,
    handleAddArtifact,
  } = useCaseArtifactPanel({ artifacts, onAddArtifact })

  return (
    <div className="flex flex-col gap-6">
      {onAddArtifact && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={artifactType}
              onValueChange={v => setArtifactType(v as CaseArtifactType)}
            >
              <SelectTrigger size="sm" className="w-28">
                <SelectValue placeholder={t('artifactType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CaseArtifactType.IP}>{t('artifactTypeIp')}</SelectItem>
                <SelectItem value={CaseArtifactType.HASH}>{t('artifactTypeHash')}</SelectItem>
                <SelectItem value={CaseArtifactType.DOMAIN}>{t('artifactTypeDomain')}</SelectItem>
                <SelectItem value={CaseArtifactType.URL}>{t('artifactTypeUrl')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={artifactValue}
              onChange={e => setArtifactValue(e.currentTarget.value)}
              placeholder={t('artifactValuePlaceholder')}
              className="h-8 flex-1 text-sm"
              disabled={addingArtifact}
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={artifactSource}
              onChange={e => setArtifactSource(e.currentTarget.value)}
              placeholder={`${t('artifactSource')} (manual)`}
              className="h-8 flex-1 text-sm"
              disabled={addingArtifact}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddArtifact}
              disabled={!artifactValue.trim() || addingArtifact}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('addArtifact')}
            </Button>
          </div>
        </div>
      )}

      {Object.entries(groupedArtifacts).map(([type, items]) => {
        if (!items) {
          return null
        }
        const artType = type as CaseArtifactType
        const Icon = lookup(ARTIFACT_TYPE_ICONS, artType) ?? Globe
        const label = lookup(ARTIFACT_TYPE_KEYS, artType)
          ? t(lookup(ARTIFACT_TYPE_KEYS, artType))
          : type

        return (
          <div key={type} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon className="text-muted-foreground h-4 w-4" />
              <span>{label}</span>
              <span className="text-muted-foreground text-xs">({items.length})</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {items.map(artifact => (
                <div
                  key={artifact.id}
                  className="border-border bg-muted/30 group flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs">{artifact.value}</span>
                    <span className="text-muted-foreground text-[10px]">
                      {t('source')}: {artifact.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <OsintEnrichButton
                      iocType={normalizeIocType(artifact.type)}
                      iocValue={artifact.value}
                      t={tCommon}
                    />
                    {isFileOrHashType(artifact.type) && <OsintFileUploadButton t={tCommon} />}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => copyToClipboard(artifact.value)}
                      title={t('copy')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {onLookup && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onLookup(artifact)}
                        title={t('lookup')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteArtifact && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => onDeleteArtifact(artifact.id)}
                        title={t('delete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {artifacts.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">{t('noArtifacts')}</p>
        </div>
      )}
    </div>
  )
}
