import { z } from 'zod'
import { CaseArtifactType } from '../../../common/enums/case-artifact-type.enum'

export const CreateArtifactSchema = z.object({
  type: z.nativeEnum(CaseArtifactType),
  value: z.string().min(1).max(2048),
  source: z.string().max(100).default('manual'),
})

export type CreateArtifactDto = z.infer<typeof CreateArtifactSchema>
