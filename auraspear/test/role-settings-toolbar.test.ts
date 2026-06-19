import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { RoleSettingsToolbar } from '@/components/admin/RoleSettingsToolbar'

describe('RoleSettingsToolbar', () => {
  it('renders the save actions inside a sticky floating container', () => {
    const markup = renderToStaticMarkup(
      createElement(RoleSettingsToolbar, {
        isDirty: true,
        isSaving: false,
        isResetting: false,
        showReset: true,
        onSave: vi.fn(),
        onReset: vi.fn(),
        t: (key: string) => key,
      })
    )

    expect(markup).toContain('sticky top-4')
    expect(markup).toContain('roleSettings.save')
    expect(markup).toContain('roleSettings.reset')
  })

  it('hides the reset button when reset is not allowed', () => {
    const markup = renderToStaticMarkup(
      createElement(RoleSettingsToolbar, {
        isDirty: true,
        isSaving: false,
        isResetting: false,
        showReset: false,
        onSave: vi.fn(),
        onReset: vi.fn(),
        t: (key: string) => key,
      })
    )

    expect(markup).toContain('roleSettings.save')
    expect(markup).not.toContain('roleSettings.reset')
  })
})
