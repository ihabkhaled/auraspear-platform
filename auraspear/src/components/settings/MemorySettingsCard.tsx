'use client'

import { Brain, Edit2, Loader2, Plus, Search, Trash2, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { useMemorySettings } from '@/hooks'
import { formatTimestamp } from '@/lib/utils'
import type { UserMemory } from '@/types'

function MemoryItem({
  memory,
  canEdit,
  onEdit,
  onDelete,
}: {
  memory: UserMemory
  canEdit: boolean
  onEdit: (memory: UserMemory) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="border-border flex items-start gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm">{memory.content}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            {memory.category}
          </Badge>
          {memory.sourceLabel && (
            <span className="text-muted-foreground text-xs">{memory.sourceLabel}</span>
          )}
          <span className="text-muted-foreground text-xs">
            {formatTimestamp(memory.updatedAt)}
          </span>
        </div>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(memory)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(memory.id)}
          >
            <Trash2 className="text-destructive h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function CreateEditDialog({
  open,
  onOpenChange,
  memory,
  onSave,
  isPending,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memory: UserMemory | null
  onSave: (data: { content: string; category: string }) => void
  isPending: boolean
  t: (key: string) => string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{memory ? t('editMemory') : t('createMemory')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            onSave({
              content: formData.get('content') as string,
              category: (formData.get('category') as string) || 'fact',
            })
          }}
        >
          <div className="space-y-4 py-4">
            <div>
              <Textarea
                name="content"
                defaultValue={memory?.content ?? ''}
                placeholder={t('contentPlaceholder')}
                rows={3}
                required
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Select name="category" defaultValue={memory?.category ?? 'fact'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fact">{t('categoryFact')}</SelectItem>
                  <SelectItem value="preference">{t('categoryPreference')}</SelectItem>
                  <SelectItem value="instruction">{t('categoryInstruction')}</SelectItem>
                  <SelectItem value="context">{t('categoryContext')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {memory ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MemorySettingsCard() {
  const {
    t,
    canView,
    canEdit,
    memories,
    totalMemories,
    isLoading,
    searchQuery,
    handleSearchChange,
    categoryFilter,
    handleCategoryChange,
    editingMemory,
    setEditingMemory,
    createDialogOpen,
    setCreateDialogOpen,
    createMemory,
    isCreating,
    updateMemory,
    isUpdating,
    deleteMemory,
    deleteAllMemories,
  } = useMemorySettings()

  if (!canView) return null

  return (
    <>
      <Collapsible defaultOpen>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="text-primary h-4 w-4" />
                  <CardTitle className="text-base">{t('title')}</CardTitle>
                  {totalMemories > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {String(totalMemories)}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground text-start text-xs">{t('description')}</p>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute start-2.5 top-2.5 h-3.5 w-3.5" />
                  <Input
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.currentTarget.value)}
                    placeholder={t('searchPlaceholder')}
                    className="h-9 ps-8 text-sm"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute end-1 top-1 h-7 w-7"
                      onClick={() => handleSearchChange('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Select value={categoryFilter || 'all'} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-9 w-full sm:w-36">
                    <SelectValue placeholder={t('allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allCategories')}</SelectItem>
                    <SelectItem value="fact">{t('categoryFact')}</SelectItem>
                    <SelectItem value="preference">{t('categoryPreference')}</SelectItem>
                    <SelectItem value="instruction">{t('categoryInstruction')}</SelectItem>
                    <SelectItem value="context">{t('categoryContext')}</SelectItem>
                  </SelectContent>
                </Select>
                {canEdit && (
                  <Button size="sm" className="h-9" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t('addMemory')}
                  </Button>
                )}
              </div>

              {/* Memory list */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              )}

              {!isLoading && memories.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Brain className="text-muted-foreground mb-2 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">{t('empty')}</p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-center text-xs">
                    {t('emptyHint')}
                  </p>
                </div>
              )}

              {!isLoading && memories.length > 0 && (
                <div className="space-y-2">
                  {memories.map(mem => (
                    <MemoryItem
                      key={mem.id}
                      memory={mem}
                      canEdit={canEdit}
                      onEdit={setEditingMemory}
                      onDelete={id => deleteMemory(id)}
                    />
                  ))}
                </div>
              )}

              {/* Delete all */}
              {canEdit && memories.length > 0 && (
                <div className="border-border flex justify-end border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteAllMemories()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('deleteAll')}
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create dialog */}
      <CreateEditDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        memory={null}
        onSave={data => createMemory(data)}
        isPending={isCreating}
        t={t}
      />

      {/* Edit dialog */}
      <CreateEditDialog
        open={Boolean(editingMemory)}
        onOpenChange={open => {
          if (!open) setEditingMemory(null)
        }}
        memory={editingMemory}
        onSave={data => {
          if (editingMemory) {
            updateMemory({ id: editingMemory.id, data })
          }
        }}
        isPending={isUpdating}
        t={t}
      />
    </>
  )
}
