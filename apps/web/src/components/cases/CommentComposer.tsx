'use client'

import { Send } from 'lucide-react'
import { Button, Textarea } from '@/components/ui'
import { useCommentComposer } from '@/hooks'
import { COMMENT_MAX_LENGTH } from '@/lib/constants/cases'
import { cn } from '@/lib/utils'
import type { CommentComposerProps } from '@/types'

export function CommentComposer({
  caseId,
  currentUserId,
  onSubmit,
  loading,
  disabled,
}: CommentComposerProps) {
  const {
    t,
    body,
    textareaRef,
    mentionSuggestions,
    showSuggestions,
    isValid,
    handleChange,
    handleKeyDown,
    handleSubmit,
    handleSelectMention,
  } = useCommentComposer({ caseId, currentUserId, onSubmit, loading })

  return (
    <div className="relative flex flex-col gap-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          className="min-h-[80px] resize-none pe-12"
          disabled={disabled ?? loading}
          maxLength={COMMENT_MAX_LENGTH}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute end-2 bottom-2 h-8 w-8"
          onClick={handleSubmit}
          disabled={disabled ?? loading ?? !isValid}
        >
          <Send className="h-4 w-4" />
        </Button>

        {showSuggestions && mentionSuggestions && mentionSuggestions.length > 0 && (
          <div className="bg-popover border-border absolute start-0 bottom-full z-50 mb-1 w-64 overflow-hidden rounded-md border shadow-md">
            <ul className="max-h-48 overflow-y-auto py-1">
              {mentionSuggestions.map(user => (
                <li key={user.id}>
                  <button
                    type="button"
                    className={cn(
                      'hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-start text-sm',
                      'focus:bg-muted outline-none'
                    )}
                    onMouseDown={e => {
                      e.preventDefault()
                      handleSelectMention(user)
                    }}
                  >
                    <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{t('mentionHint')}</p>
        <p className="text-muted-foreground text-xs">
          {body.length}/{COMMENT_MAX_LENGTH}
        </p>
      </div>
    </div>
  )
}
