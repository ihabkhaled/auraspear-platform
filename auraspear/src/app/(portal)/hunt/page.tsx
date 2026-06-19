'use client'

import { MessageSquare, BarChart3 } from 'lucide-react'
import { HuntChatPanel, HuntResultsPanel } from '@/components/hunt'
import { Button } from '@/components/ui'
import { HuntMobileTab, HuntStatus } from '@/enums'
import { useHuntPage } from '@/hooks'

export default function HuntPage() {
  const {
    t,
    mobileTab,
    setMobileTab,
    messages,
    huntStatus,
    huntId,
    events,
    uniqueIps,
    threatScore,
    eventsFound,
    eventsLoading,
    isSending,
    handleSend,
    handleNewHunt,
    page,
    totalPages,
    total,
    onPageChange,
    canCreate,
    canExecute,
  } = useHuntPage()

  return (
    <div className="bg-card -m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden md:-m-6">
      {/* Mobile tab bar */}
      <div className="border-border flex border-b lg:hidden">
        <Button
          variant={mobileTab === HuntMobileTab.CHAT ? 'default' : 'ghost'}
          className="min-h-[44px] flex-1 gap-2 rounded-none"
          onClick={() => setMobileTab(HuntMobileTab.CHAT)}
        >
          <MessageSquare className="h-4 w-4" />
          {t('chatTitle')}
        </Button>
        <Button
          variant={mobileTab === HuntMobileTab.RESULTS ? 'default' : 'ghost'}
          className="min-h-[44px] flex-1 gap-2 rounded-none"
          onClick={() => setMobileTab(HuntMobileTab.RESULTS)}
        >
          <BarChart3 className="h-4 w-4" />
          {t('resultsTitle')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Chat panel: visible on mobile when tab=chat, always visible on desktop */}
        <div
          className={
            mobileTab === HuntMobileTab.CHAT ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
          }
        >
          <HuntChatPanel
            messages={messages}
            onSend={canExecute ? handleSend : undefined}
            disabled={isSending || !canExecute}
            hasSession={huntId !== null}
            onNewHunt={canCreate ? handleNewHunt : undefined}
          />
        </div>

        {/* Results panel: visible on mobile when tab=results, always visible on desktop */}
        <div
          className={
            mobileTab === HuntMobileTab.RESULTS ? 'flex flex-1' : 'hidden lg:flex lg:flex-1'
          }
        >
          <HuntResultsPanel
            sessionId={huntId ?? ''}
            status={huntStatus ?? HuntStatus.IDLE}
            eventsFound={eventsFound}
            uniqueIps={uniqueIps}
            threatScore={threatScore}
            events={events}
            loading={eventsLoading}
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  )
}
