import { z } from 'zod'
import { PatchStatus, VulnerabilitySeverity } from '@/enums'

export const CVE_ID_PATTERN = /^CVE-\d{4}-\d{4,}$/

export const createVulnerabilitySchema = z.object({
  cveId: z.string().regex(CVE_ID_PATTERN),
  cvssScore: z.number().min(0).max(10),
  severity: z.nativeEnum(VulnerabilitySeverity),
  description: z.string().min(10),
  affectedHosts: z.number().int().min(0),
  exploitAvailable: z.boolean(),
  patchStatus: z.nativeEnum(PatchStatus),
  affectedSoftware: z.string(),
  remediation: z.string(),
  references: z.string(),
})

export const editVulnerabilitySchema = z.object({
  cveId: z.string().regex(CVE_ID_PATTERN),
  cvssScore: z.number().min(0).max(10),
  severity: z.nativeEnum(VulnerabilitySeverity),
  description: z.string().min(10),
  affectedHosts: z.number().int().min(0),
  exploitAvailable: z.boolean(),
  patchStatus: z.nativeEnum(PatchStatus),
  affectedSoftware: z.string(),
  remediation: z.string(),
  references: z.string(),
})
