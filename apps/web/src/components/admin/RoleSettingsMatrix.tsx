import { ChevronDown } from 'lucide-react'
import {
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui'
import { cn, lookup } from '@/lib/utils'
import type { RoleSettingsMatrixProps } from '@/types'

export function RoleSettingsMatrix({
  permissionGroups,
  configurableRoles,
  isChecked,
  onToggle,
  isToggleDisabled,
  disabled,
  permissionLabelMap,
  t,
}: RoleSettingsMatrixProps) {
  const gridTemplateColumns = `minmax(220px, 1.4fr) repeat(${configurableRoles.length}, minmax(88px, 1fr))`

  return (
    <div className="space-y-4">
      {permissionGroups.map(group => (
        <Collapsible key={group.key} defaultOpen>
          <div className="border-border rounded-lg border">
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between rounded-t-lg p-3 transition-colors">
              <span className="text-sm font-semibold">{t(group.labelKey)}</span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="overflow-x-auto p-3">
                <div className="min-w-[720px] space-y-3">
                  <div
                    className="text-muted-foreground grid items-center gap-3 px-3 text-xs font-semibold"
                    style={{ gridTemplateColumns }}
                  >
                    <div>{t('roleSettings.permission')}</div>
                    {configurableRoles.map(role => (
                      <div key={role} className="text-center">
                        {t(`roleSettings.roles.${role}`)}
                      </div>
                    ))}
                  </div>

                  {group.permissions.map(permission => {
                    const labelKey = lookup(permissionLabelMap, permission) ?? permission

                    return (
                      <div
                        key={permission}
                        className={cn(
                          'border-border bg-card grid items-center gap-3 rounded-xl border px-3 py-3',
                          'hover:bg-muted/30 transition-colors'
                        )}
                        style={{ gridTemplateColumns }}
                      >
                        <div className="text-sm font-medium">{t(labelKey)}</div>

                        {configurableRoles.map(role => (
                          <div key={role} className="flex justify-center">
                            <Checkbox
                              className="cursor-pointer"
                              checked={isChecked(role, permission)}
                              onCheckedChange={checked =>
                                onToggle(role, permission, Boolean(checked))
                              }
                              disabled={disabled || isToggleDisabled?.(role, permission) === true}
                              aria-label={`${t(labelKey)} - ${t(`roleSettings.roles.${role}`)}`}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
