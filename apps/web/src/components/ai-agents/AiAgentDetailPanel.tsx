'use client'

import { Bot, ChevronDown, Edit, Play, Plus, Save, Square, Trash2, Wrench, X } from 'lucide-react'
import { AiConnectorSelect } from '@/components/common'
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui'
import { AiAgentPanelTab } from '@/enums'
import { useAiAgentDetailPanel } from '@/hooks'
import { AI_AGENT_STATUS_CLASSES, AI_AGENT_TIER_CLASSES } from '@/lib/constants/ai-agents'
import { cn, lookup } from '@/lib/utils'
import type { AiAgentDetailPanelProps } from '@/types'
import { AiAgentDeleteDialog } from './AiAgentDeleteDialog'
import { AiAgentSessionTable } from './AiAgentSessionTable'
import { AiAgentToolDialog } from './AiAgentToolDialog'

export function AiAgentDetailPanel(props: AiAgentDetailPanelProps) {
  const {
    t,
    agent,
    activeTab,
    handleActiveTabChange,
    soulMdDraft,
    setSoulMdDraft,
    runPrompt,
    setRunPrompt,
    toolDialogOpen,
    setToolDialogOpen,
    sessionsOpen,
    setSessionsOpen,
    toolsOpen,
    setToolsOpen,
    soulOpen,
    setSoulOpen,
    statusLabel,
    tierLabel,
    formattedTokens,
    formattedCost,
    formattedDate,
    handleSaveSoul,
    handleToggleAgent,
    handleRunAgent,
    isAgentOnline,
    canExecute,
    isSavingSoul,
    isToggling,
    isRunningAgent,
    isCreatingTool,
    isDeletingTool,
    handleCreateTool,
    handleDeleteTool,
    onClose,
    onEdit,
    onDelete,
  } = useAiAgentDetailPanel(props)

  return (
    <div className="bg-card border-border flex flex-col rounded-lg border">
      <div className="border-border flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <Bot className="text-muted-foreground h-5 w-5" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-semibold">{agent.name}</h3>
            <p className="text-muted-foreground text-xs">{agent.model}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('editAgent')}</span>
            </Button>
          )}
          {onDelete && <AiAgentDeleteDialog agentName={agent.name} onConfirm={() => onDelete()} />}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleActiveTabChange} className="flex-1">
        <TabsList className="border-border w-full justify-start overflow-x-auto rounded-none border-b px-4">
          <TabsTrigger value={AiAgentPanelTab.OVERVIEW}>{t('tabOverview')}</TabsTrigger>
          <TabsTrigger value={AiAgentPanelTab.SOUL}>{t('tabSoul')}</TabsTrigger>
          <TabsTrigger value={AiAgentPanelTab.SESSIONS}>{t('tabSessions')}</TabsTrigger>
          <TabsTrigger value={AiAgentPanelTab.TOOLS}>{t('tabTools')}</TabsTrigger>
        </TabsList>

        <TabsContent value={AiAgentPanelTab.OVERVIEW} className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('colStatus')}</p>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  lookup(AI_AGENT_STATUS_CLASSES, agent.status)
                )}
              >
                {statusLabel}
              </span>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('colTier')}</p>
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                  lookup(AI_AGENT_TIER_CLASSES, agent.tier)
                )}
              >
                {tierLabel}
              </span>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('colTasks')}</p>
              <p className="text-foreground text-sm font-semibold">{agent.totalTasks}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('kpiTotalSessions')}</p>
              <p className="text-foreground text-sm font-semibold">{agent.sessionsCount}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('colTokens')}</p>
              <p className="text-foreground font-mono text-sm font-semibold">{formattedTokens}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('colCost')}</p>
              <p className="text-foreground font-mono text-sm font-semibold">{formattedCost}</p>
            </div>
            <div className="bg-muted/50 col-span-1 rounded-lg p-3 sm:col-span-2">
              <p className="text-muted-foreground mb-1 text-xs">{t('fieldDescription')}</p>
              <p className="text-foreground text-sm">{agent.description ?? '-'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">{t('createdAt')}</p>
              <p className="text-foreground text-sm">{formattedDate}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {isAgentOnline ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleToggleAgent}
                disabled={isToggling}
                className="gap-1.5"
              >
                <Square className="h-3.5 w-3.5" />
                {isToggling ? t('stopping') : t('stopAgent')}
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleToggleAgent}
                disabled={isToggling}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                {isToggling ? t('starting') : t('startAgent')}
              </Button>
            )}
          </div>
          {canExecute ? (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border p-3">
              <div>
                <p className="text-foreground text-sm font-semibold">{t('runAgent')}</p>
                <p className="text-muted-foreground text-xs">{t('runAgentDescription')}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-muted-foreground text-xs font-medium">
                  {t('connectorLabel')}
                </label>
                <AiConnectorSelect className="w-full sm:w-64" />
              </div>
              <Textarea
                value={runPrompt}
                onChange={e => setRunPrompt(e.currentTarget.value)}
                placeholder={t('runPromptPlaceholder')}
                className="min-h-28 resize-none text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleRunAgent}
                  disabled={isRunningAgent || runPrompt.trim().length === 0}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isRunningAgent ? t('queueingRun') : t('queueRun')}
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value={AiAgentPanelTab.SOUL} className="p-4">
          <Collapsible open={soulOpen} onOpenChange={setSoulOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
              <p className="text-muted-foreground text-sm">{t('soulEditor')}</p>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  soulOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-3 pt-2">
                <Textarea
                  value={soulMdDraft}
                  onChange={e => setSoulMdDraft(e.currentTarget.value)}
                  className="h-64 resize-none font-mono text-sm"
                  placeholder={t('fieldSoulMdPlaceholder')}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveSoul}
                    disabled={isSavingSoul}
                    className="gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSavingSoul ? t('saving') : t('saveSoul')}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value={AiAgentPanelTab.SESSIONS} className="p-4">
          <Collapsible open={sessionsOpen} onOpenChange={setSessionsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
              <p className="text-foreground text-sm font-semibold">{t('tabSessions')}</p>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  sessionsOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-2">
                <AiAgentSessionTable agentId={agent.id} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        <TabsContent value={AiAgentPanelTab.TOOLS} className="p-4">
          <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
              <p className="text-foreground text-sm font-semibold">{t('tabTools')}</p>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  toolsOpen && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">{t('toolsDescription')}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setToolDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('addTool')}
                  </Button>
                </div>
                {!agent.tools || agent.tools.length === 0 ? (
                  <div className="bg-muted/50 flex flex-col items-center gap-2 rounded-lg py-8">
                    <Wrench className="text-muted-foreground h-8 w-8" />
                    <p className="text-muted-foreground text-sm">{t('noTools')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {agent.tools.map(tool => (
                      <div
                        key={tool.id}
                        className="bg-muted/50 border-border flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="text-muted-foreground h-4 w-4" />
                          <div>
                            <span className="text-foreground text-sm font-medium">{tool.name}</span>
                            {tool.description && (
                              <p className="text-muted-foreground text-xs">{tool.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTool(tool.id)}
                          disabled={isDeletingTool}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <AiAgentToolDialog
            open={toolDialogOpen}
            onOpenChange={setToolDialogOpen}
            onSubmit={handleCreateTool}
            loading={isCreatingTool}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
