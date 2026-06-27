/**
 * Versioned prompt registry. Prompts are content + a version so that AI outputs
 * can record which prompt produced them (provenance) and evals can pin a
 * version. Keep prompt TEXT here; bind tenant/runtime context at call time.
 */

export interface PromptTemplate {
  readonly key: string
  readonly version: string
  readonly description: string
  /** `render` interpolates named variables; unknown vars are left intact. */
  readonly template: string
}

export type PromptVariables = Readonly<Record<string, string | number>>

export function renderPrompt(prompt: PromptTemplate, variables: PromptVariables): string {
  // Map lookup (vs computed member access) sidesteps prototype-pollution reads
  // and the object-injection sink, and only sees own enumerable keys — so
  // inherited props like `toString` are never interpolated.
  const values = new Map<string, string | number>(Object.entries(variables))
  return prompt.template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, name: string) => {
    const value = values.get(name)
    return value === undefined ? match : String(value)
  })
}

/** Starter catalog — extend per AI surface. Each surface should pin a version. */
export const PROMPTS = {
  alertTriage: {
    key: 'alert.triage',
    version: '2026-06-19',
    description: 'Summarize an alert, infer likely MITRE technique, recommend triage steps.',
    template: [
      'You are a SOC Tier-1 triage assistant. Given the alert below, produce a concise',
      'triage summary, the single most likely MITRE ATT&CK technique id, and 3 next steps.',
      'Cite evidence fields you used. If evidence is insufficient, say what is missing.',
      '',
      'Alert:\n{{alert}}',
    ].join('\n'),
  },
  iocEnrichment: {
    key: 'ioc.enrichment',
    version: '2026-06-19',
    description:
      'Enrich an IOC, correlate with tenant history, flag false positives, cite sources.',
    template: [
      'Enrich the {{iocType}} indicator "{{ioc}}". Assess whether it is malicious, estimate',
      'false-positive likelihood (0..1), and list the sources/connectors you relied on.',
    ].join('\n'),
  },
} as const satisfies Record<string, PromptTemplate>

export type PromptKey = keyof typeof PROMPTS
