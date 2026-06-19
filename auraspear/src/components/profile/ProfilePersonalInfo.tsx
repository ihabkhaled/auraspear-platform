'use client'

import { User, Mail, Shield, Building2, ChevronDown } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
} from '@/components/ui'
import type { ProfilePersonalInfoProps } from '@/types'

export function ProfilePersonalInfo({
  displayEmail,
  roleLabelKey,
  displayTenant,
  t,
  tRoles,
}: ProfilePersonalInfoProps) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('personalInfo')}
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Mail className="h-3.5 w-3.5" />
                  {t('email')}
                </Label>
                <p className="text-foreground text-sm font-medium">{displayEmail}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Shield className="h-3.5 w-3.5" />
                  {t('role')}
                </Label>
                <p className="text-foreground text-sm font-medium">
                  {roleLabelKey ? tRoles(roleLabelKey) : '-'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5" />
                  {t('tenant')}
                </Label>
                <p className="text-foreground text-sm font-medium">{displayTenant || '-'}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
