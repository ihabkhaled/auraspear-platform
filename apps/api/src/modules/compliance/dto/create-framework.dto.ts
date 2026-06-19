import { z } from 'zod'

export const ComplianceStandardEnum = z.enum([
  'iso_27001',
  'nist',
  'pci_dss',
  'soc2',
  'hipaa',
  'gdpr',
])

export const CreateFrameworkSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().max(4096).optional(),
  standard: ComplianceStandardEnum,
  version: z.string().min(1).max(50),
})

export type CreateFrameworkDto = z.infer<typeof CreateFrameworkSchema>
