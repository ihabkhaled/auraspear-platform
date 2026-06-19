'use client'

import { Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  Progress,
} from '@/components/ui'
import { CaseTaskStatus } from '@/enums'
import { useCaseTaskList } from '@/hooks'
import type { CaseTaskListProps } from '@/types'

export function CaseTaskList({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  addingTask,
}: CaseTaskListProps) {
  const {
    t,
    newTaskTitle,
    setNewTaskTitle,
    completedCount,
    totalCount,
    progressValue,
    handleAddTask,
    handleKeyDown,
  } = useCaseTaskList({ tasks, onAddTask })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('tasksCompleted', { completed: completedCount, total: totalCount })}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {Math.round(progressValue)}%
          </span>
        </div>
        <Progress value={progressValue} />
      </div>

      {onAddTask && (
        <div className="flex items-center gap-2">
          <Input
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('addTaskPlaceholder')}
            className="h-8 text-sm"
            disabled={addingTask}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim() || addingTask}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addTask')}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tasks.map(task => {
          const isCompleted = task.status === CaseTaskStatus.COMPLETED

          return (
            <label
              key={task.id}
              className="border-border hover:bg-muted/50 group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={checked => {
                  onToggleTask?.(task.id, Boolean(checked))
                }}
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <span
                  className={isCompleted ? 'text-muted-foreground text-sm line-through' : 'text-sm'}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-1">
                  {task.assignee && (
                    <span className="text-muted-foreground text-xs">{task.assignee}</span>
                  )}
                  {onDeleteTask && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDeleteTask(task.id)
                      }}
                      title={t('delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </label>
          )
        })}

        {tasks.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('noTasks')}</p>
        )}
      </div>
    </div>
  )
}
