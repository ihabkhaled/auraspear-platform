'use client'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui'
import { useCommandPalette } from '@/hooks'

export function CommandPalette() {
  const { t, commandPaletteOpen, setCommandPaletteOpen, handleSelect, pages, actions } =
    useCommandPalette()

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title={t('layout.commandPaletteTitle')}
      description={t('layout.commandPaletteDescription')}
    >
      <CommandInput placeholder={t('layout.searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('layout.noResults')}</CommandEmpty>
        <CommandGroup heading={t('layout.pages')}>
          {pages.map(page => {
            const Icon = page.icon
            return (
              <CommandItem key={page.href} onSelect={() => handleSelect(page.href)}>
                <Icon className="h-4 w-4" />
                <span>{page.label}</span>
              </CommandItem>
            )
          })}
        </CommandGroup>
        {actions.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading={t('layout.actions')}>
              {actions.map(action => {
                const Icon = action.icon
                return (
                  <CommandItem key={action.href} onSelect={() => handleSelect(action.href)}>
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
