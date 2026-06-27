import { describe, it, expect } from 'vitest'
import { PROMPTS, renderPrompt, type PromptTemplate } from '../src/prompts.ts'

const tpl: PromptTemplate = {
  key: 'test',
  version: '1',
  description: 'test template',
  template: 'Hello {{name}}, you have {{count}} alerts. {{ name }} again.',
}

describe('renderPrompt', () => {
  it('interpolates named variables, including repeated and whitespaced placeholders', () => {
    const out = renderPrompt(tpl, { name: 'Ana', count: 3 })
    expect(out).toBe('Hello Ana, you have 3 alerts. Ana again.')
  })

  it('stringifies number values', () => {
    expect(renderPrompt({ ...tpl, template: '{{count}}' }, { count: 42 })).toBe('42')
  })

  it('leaves unknown variables intact', () => {
    expect(renderPrompt({ ...tpl, template: 'x={{missing}}' }, {})).toBe('x={{missing}}')
  })

  it('does not interpolate inherited prototype properties (own-property guard)', () => {
    expect(renderPrompt({ ...tpl, template: '{{toString}}' }, {})).toBe('{{toString}}')
  })

  it('renders the built-in alertTriage prompt with its alert variable', () => {
    const out = renderPrompt(PROMPTS.alertTriage, { alert: 'suspicious login' })
    expect(out).toContain('suspicious login')
    expect(out).not.toContain('{{alert}}')
  })

  it('renders the built-in iocEnrichment prompt with both variables', () => {
    const out = renderPrompt(PROMPTS.iocEnrichment, { iocType: 'domain', ioc: 'evil.example' })
    expect(out).toContain('domain')
    expect(out).toContain('evil.example')
  })
})

describe('PROMPTS catalog', () => {
  it('every prompt carries a key, a pinned version, and a description', () => {
    for (const prompt of Object.values(PROMPTS)) {
      expect(prompt.key.length).toBeGreaterThan(0)
      expect(prompt.version).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(prompt.description.length).toBeGreaterThan(0)
    }
  })
})
