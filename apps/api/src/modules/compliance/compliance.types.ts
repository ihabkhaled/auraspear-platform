import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { ComplianceFramework } from '@prisma/client'

export interface ComplianceFrameworkRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  standard: string
  version: string
  totalControls: number
  passedControls: number
  failedControls: number
  complianceScore: number
  tenantName: string
  createdAt: Date
  updatedAt: Date
}

export type PaginatedFrameworks = PaginatedResponse<ComplianceFrameworkRecord>

export interface ComplianceControlRecord {
  id: string
  frameworkId: string
  controlNumber: string
  title: string
  description: string | null
  status: string
  evidence: string | null
  assessedAt: Date | null
  assessedBy: string | null
  assessedByName: string | null
  createdAt: Date
  updatedAt: Date
}

export type ComplianceFrameworkWithTenant = ComplianceFramework & { tenant: { name: string } }

export interface ComplianceStats {
  totalFrameworks: number
  overallComplianceScore: number
  passedControls: number
  failedControls: number
  notAssessedControls: number
  partiallyMetControls: number
}

export interface FrameworkWithTenant {
  id: string
  tenantId: string
  name: string
  description: string | null
  standard: string
  version: string
  tenant: { name: string }
  createdAt: Date
  updatedAt: Date
}

export interface ControlEntity {
  id: string
  frameworkId: string
  controlNumber: string
  title: string
  description: string | null
  status: string
  evidence: string | null
  assessedAt: Date | null
  assessedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ControlCountEntry {
  status: string
  _count: { id: number }
}

export interface GroupedControlEntry {
  frameworkId: string
  status: string
  _count: { id: number }
}
