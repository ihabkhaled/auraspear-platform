'use client'

import { Edit2, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui'
import { CommentPartType } from '@/enums'
import { useCommentItem } from '@/hooks'
import { COMMENT_COLLAPSE_HEIGHT_PX } from '@/lib/constants/cases'
import { cn, formatTimestamp } from '@/lib/utils'
import type { CommentItemProps } from '@/types'

export function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const { t, expanded, isOverflowing, measureOverflow, toggleExpanded, parseMentions } =
    useCommentItem(comment)

  const canModify = comment.author.id === currentUserId || isAdmin
  const showActions = canModify && (onEdit ?? onDelete)

  return (
    <div id={`comment-${comment.id}`} className="group flex gap-3 py-3">
      <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        {comment.author.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.author.name}</span>
          <span className="text-muted-foreground text-xs">{comment.author.email}</span>
          <span className="text-muted-foreground text-xs">
            {formatTimestamp(comment.createdAt)}
          </span>
          {comment.isEdited && (
            <span className="text-muted-foreground text-xs italic">({t('edited')})</span>
          )}

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ms-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(comment.id, comment.body)}>
                    <Edit2 className="me-2 h-3.5 w-3.5" />
                    {t('editAction')}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 h-3.5 w-3.5" />
                    {t('deleteAction')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div
          ref={measureOverflow}
          className={cn(
            'mt-1 overflow-hidden transition-[max-height] duration-300',
            expanded ? 'max-h-none' : `max-h-[${String(COMMENT_COLLAPSE_HEIGHT_PX)}px]`
          )}
          style={expanded ? undefined : { maxHeight: `${String(COMMENT_COLLAPSE_HEIGHT_PX)}px` }}
        >
          <p className="text-foreground text-sm break-words whitespace-pre-wrap">
            {parseMentions().map((part, i) => {
              const key = `${part.type}-${String(i)}`
              if (part.type === CommentPartType.MENTION) {
                return (
                  <span
                    key={key}
                    className="bg-primary/10 text-primary rounded px-1 py-0.5 font-medium"
                  >
                    {part.value}
                  </span>
                )
              }
              return <span key={key}>{part.value}</span>
            })}
          </p>
        </div>

        {isOverflowing && (
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto p-0 text-xs"
            onClick={toggleExpanded}
          >
            {expanded ? t('showLess') : t('showMore')}
          </Button>
        )}
      </div>
    </div>
  )
}
