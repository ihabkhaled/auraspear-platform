import { describe, it, expect } from 'vitest'
import { AgentAutomationMode, AgentActionType, AgentRiskLevel } from '@/enums/agent-automation.enum'

describe('Agent Automation Enums', () => {
  // ─── AgentAutomationMode ────────────────────────────────────────

  describe('AgentAutomationMode', () => {
    it('should have 12 values', () => {
      const values = Object.values(AgentAutomationMode)
      expect(values).toHaveLength(12)
    })

    it('values should be lowercase strings matching enum names', () => {
      expect(AgentAutomationMode.DISABLED).toBe('disabled')
      expect(AgentAutomationMode.MANUAL_ONLY).toBe('manual_only')
      expect(AgentAutomationMode.SUGGEST_ONLY).toBe('suggest_only')
      expect(AgentAutomationMode.DRAFT_ONLY).toBe('draft_only')
      expect(AgentAutomationMode.ENRICH_ONLY).toBe('enrich_only')
      expect(AgentAutomationMode.APPROVAL_REQUIRED).toBe('approval_required')
      expect(AgentAutomationMode.AUTO_LOW_RISK).toBe('auto_low_risk')
      expect(AgentAutomationMode.AUTO_GOVERNED).toBe('auto_governed')
      expect(AgentAutomationMode.SCHEDULED).toBe('scheduled')
      expect(AgentAutomationMode.EVENT_DRIVEN).toBe('event_driven')
      expect(AgentAutomationMode.ANALYST_INVOKED).toBe('analyst_invoked')
      expect(AgentAutomationMode.ORCHESTRATOR_INVOKED).toBe('orchestrator_invoked')
    })
  })

  // ─── AgentActionType ────────────────────────────────────────────

  describe('AgentActionType', () => {
    it('should have 18 values', () => {
      const values = Object.values(AgentActionType)
      expect(values).toHaveLength(18)
    })

    it('values should be lowercase strings matching enum names', () => {
      expect(AgentActionType.CREATE).toBe('create')
      expect(AgentActionType.UPDATE).toBe('update')
      expect(AgentActionType.ENRICH).toBe('enrich')
      expect(AgentActionType.SCORE).toBe('score')
      expect(AgentActionType.CLASSIFY).toBe('classify')
      expect(AgentActionType.SUMMARIZE).toBe('summarize')
      expect(AgentActionType.DRAFT).toBe('draft')
      expect(AgentActionType.PROPOSE).toBe('propose')
      expect(AgentActionType.ESCALATE).toBe('escalate')
      expect(AgentActionType.TRIAGE).toBe('triage')
      expect(AgentActionType.CORRELATE).toBe('correlate')
      expect(AgentActionType.INVESTIGATE).toBe('investigate')
      expect(AgentActionType.RECOMMEND).toBe('recommend')
      expect(AgentActionType.VALIDATE).toBe('validate')
      expect(AgentActionType.SYNC).toBe('sync')
      expect(AgentActionType.REVIEW).toBe('review')
      expect(AgentActionType.REPORT).toBe('report')
      expect(AgentActionType.EXPLAIN).toBe('explain')
    })
  })

  // ─── AgentRiskLevel ─────────────────────────────────────────────

  describe('AgentRiskLevel', () => {
    it('should have 5 values', () => {
      const values = Object.values(AgentRiskLevel)
      expect(values).toHaveLength(5)
    })

    it('values should be lowercase strings matching enum names', () => {
      expect(AgentRiskLevel.NONE).toBe('none')
      expect(AgentRiskLevel.LOW).toBe('low')
      expect(AgentRiskLevel.MEDIUM).toBe('medium')
      expect(AgentRiskLevel.HIGH).toBe('high')
      expect(AgentRiskLevel.CRITICAL).toBe('critical')
    })
  })
})
