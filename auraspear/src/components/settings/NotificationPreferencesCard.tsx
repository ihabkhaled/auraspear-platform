'use client'

import { Bell, ChevronDown } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  Switch,
} from '@/components/ui'
import { useNotificationPreferences } from '@/hooks'
import { CATEGORY_DESCRIPTION_KEYS, CATEGORY_LABEL_KEYS } from '@/lib/constants/settings'
import { lookup } from '@/lib/utils'

export default function NotificationPreferencesCard() {
  const { t, categoryStates, isPending, handleToggle } = useNotificationPreferences()

  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t('notificationPreferences')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {categoryStates.map(({ category, enabled }, index) => (
              <div key={category}>
                {index > 0 && <div className="bg-border mb-4 h-px" />}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor={`notification-${category}`}>
                      {t(lookup(CATEGORY_LABEL_KEYS, category))}
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      {t(lookup(CATEGORY_DESCRIPTION_KEYS, category))}
                    </p>
                  </div>
                  <Switch
                    id={`notification-${category}`}
                    checked={enabled}
                    onCheckedChange={(checked: boolean) => handleToggle(category, checked)}
                    disabled={isPending}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
