import { z } from 'zod'

export const createRunbookSchema = z.object({
  title: z.string().min(2).max(500),
  content: z.string().min(10).max(100000),
  category: z.string().max(100),
  tags: z.string().max(2000),
})

export const editRunbookSchema = z.object({
  title: z.string().min(2).max(500),
  content: z.string().min(10).max(100000),
  category: z.string().max(100),
  tags: z.string().max(2000),
})

export const aiGenerateSchema = z.object({
  description: z.string().min(10).max(4000),
})

export const aiSearchSchema = z.object({
  query: z.string().min(2).max(2000),
})
