'use client'

import { Bot, Search, Sparkles } from 'lucide-react'
import { AiConnectorSelect } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@/components/ui'
import { useAiKnowledgePanel } from '@/hooks'
import type { AiKnowledgePanelProps } from '@/types'

export function AiKnowledgePanel({
  aiGenerate,
  aiSearch,
  t,
}: AiKnowledgePanelProps) {
  const {
    generateInput,
    setGenerateInput,
    searchInput,
    setSearchInput,
    handleGenerate,
    handleSearch,
  } = useAiKnowledgePanel({ aiGenerate, aiSearch })

  return (
    <div className="space-y-3">
      <AiConnectorSelect />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" />
              {t('aiGenerate')}
            </CardTitle>
            <p className="text-muted-foreground text-xs">{t('aiGenerateDescription')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={generateInput}
              onChange={e => setGenerateInput(e.target.value)}
              placeholder={t('aiGenerateDescription')}
              className="resize-none text-xs"
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={aiGenerate.isPending || generateInput.length < 10}
            >
              <Bot className="me-1 h-3.5 w-3.5" />
              {aiGenerate.isPending ? t('aiLoading') : t('aiGenerate')}
            </Button>
            {aiGenerate.data && (
              <pre className="bg-muted max-h-[200px] overflow-auto rounded-md p-2 text-xs whitespace-pre-wrap">
                {aiGenerate.data.result}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4" />
              {t('aiSearch')}
            </CardTitle>
            <p className="text-muted-foreground text-xs">{t('aiSearchDescription')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('aiSearchDescription')}
              className="resize-none text-xs"
              rows={3}
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={aiSearch.isPending || searchInput.length < 2}
            >
              <Search className="me-1 h-3.5 w-3.5" />
              {aiSearch.isPending ? t('aiLoading') : t('aiSearch')}
            </Button>
            {aiSearch.data && (
              <pre className="bg-muted max-h-[200px] overflow-auto rounded-md p-2 text-xs whitespace-pre-wrap">
                {aiSearch.data.result}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
