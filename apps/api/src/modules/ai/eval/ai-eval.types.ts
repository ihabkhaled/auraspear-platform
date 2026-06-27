import type { AiEvalRun, AiEvalSuite } from '@prisma/client'

export type AiEvalSuiteWithRunCount = AiEvalSuite & { _count: { runs: number } }

export type AiEvalRunWithSuiteName = AiEvalRun & { suite: { name: string } }

export interface AiEvalRunStatusCount {
  status: string
  _count: { id: number }
}

export interface AiEvalStatsResponse {
  totalSuites: number
  totalRuns: number
  avgScore: number | null
  pendingRuns: number
  completedRuns: number
  failedRuns: number
}

export interface AiEvalCreateSuiteData {
  name: string
  description: string | null
  datasetJson: object
  createdBy: string
}

export interface AiEvalCreateRunData {
  suiteId: string
  provider: string
  model: string
  status: string
  totalCases: number
  createdBy: string
}
