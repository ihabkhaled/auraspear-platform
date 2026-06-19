import { Injectable } from '@nestjs/common'
import { USER_SELECT } from './ai-chat.constants'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiChatMessage, AiChatThread, Prisma } from '@prisma/client'

@Injectable()
export class AiChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------------ */
  /* Thread operations                                                    */
  /* ------------------------------------------------------------------ */

  async findThreads(params: {
    where: Prisma.AiChatThreadWhereInput
    orderBy: Prisma.AiChatThreadOrderByWithRelationInput
    take: number
  }): Promise<AiChatThread[]> {
    return this.prisma.aiChatThread.findMany({
      where: params.where,
      include: { user: { select: USER_SELECT } },
      orderBy: params.orderBy,
      take: params.take,
    })
  }

  async findThreadById(id: string): Promise<AiChatThread | null> {
    return this.prisma.aiChatThread.findUnique({ where: { id } })
  }

  async createThread(data: Prisma.AiChatThreadUncheckedCreateInput): Promise<AiChatThread> {
    return this.prisma.aiChatThread.create({
      data,
      include: { user: { select: USER_SELECT } },
    })
  }

  async updateThread(
    id: string,
    data: Prisma.AiChatThreadUncheckedUpdateInput,
    options?: { includeUser?: boolean }
  ): Promise<AiChatThread> {
    return this.prisma.aiChatThread.update({
      where: { id },
      data,
      include: options?.includeUser ? { user: { select: USER_SELECT } } : undefined,
    })
  }

  /* ------------------------------------------------------------------ */
  /* Message operations                                                   */
  /* ------------------------------------------------------------------ */

  async findMessages(params: {
    where: Prisma.AiChatMessageWhereInput
    orderBy: Prisma.AiChatMessageOrderByWithRelationInput
    take: number
    select?: Prisma.AiChatMessageSelect
  }): Promise<AiChatMessage[]> {
    if (params.select) {
      return this.prisma.aiChatMessage.findMany({
        where: params.where,
        orderBy: params.orderBy,
        take: params.take,
        select: params.select,
      }) as Promise<AiChatMessage[]>
    }
    return this.prisma.aiChatMessage.findMany({
      where: params.where,
      orderBy: params.orderBy,
      take: params.take,
    })
  }

  async createMessage(data: Prisma.AiChatMessageUncheckedCreateInput): Promise<AiChatMessage> {
    return this.prisma.aiChatMessage.create({ data })
  }

  /* ------------------------------------------------------------------ */
  /* Job operations                                                       */
  /* ------------------------------------------------------------------ */

  async createJob(data: Prisma.JobUncheckedCreateInput): Promise<void> {
    await this.prisma.job.create({ data })
  }
}
