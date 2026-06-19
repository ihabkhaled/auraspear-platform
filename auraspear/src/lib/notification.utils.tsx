import {
  Bell,
  Building2,
  ClipboardList,
  FileText,
  MessageSquare,
  Pencil,
  Shield,
  ShieldOff,
  ArrowRightLeft,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
} from 'lucide-react'
import { NotificationType, StatusBgClass, StatusTextClass } from '@/enums'

export function getNotificationIcon(type: string) {
  switch (type) {
    case NotificationType.MENTION:
      return <MessageSquare className="h-4 w-4" />
    case NotificationType.CASE_ASSIGNED:
      return <UserPlus className="h-4 w-4" />
    case NotificationType.CASE_UNASSIGNED:
      return <UserMinus className="h-4 w-4" />
    case NotificationType.CASE_COMMENT_ADDED:
      return <MessageSquare className="h-4 w-4" />
    case NotificationType.CASE_TASK_ADDED:
      return <ClipboardList className="h-4 w-4" />
    case NotificationType.CASE_ARTIFACT_ADDED:
      return <FileText className="h-4 w-4" />
    case NotificationType.CASE_STATUS_CHANGED:
      return <ArrowRightLeft className="h-4 w-4" />
    case NotificationType.CASE_UPDATED:
      return <Pencil className="h-4 w-4" />
    case NotificationType.TENANT_ASSIGNED:
      return <Building2 className="h-4 w-4" />
    case NotificationType.ROLE_CHANGED:
      return <Shield className="h-4 w-4" />
    case NotificationType.USER_BLOCKED:
      return <ShieldOff className="h-4 w-4" />
    case NotificationType.USER_UNBLOCKED:
      return <UserCheck className="h-4 w-4" />
    case NotificationType.USER_REMOVED:
      return <UserX className="h-4 w-4" />
    case NotificationType.USER_RESTORED:
      return <UserCheck className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

export function getNotificationIconColor(type: string): string {
  switch (type) {
    case NotificationType.USER_BLOCKED:
    case NotificationType.USER_REMOVED:
      return `${StatusBgClass.DESTRUCTIVE_10} ${StatusTextClass.DESTRUCTIVE}`
    case NotificationType.USER_UNBLOCKED:
    case NotificationType.USER_RESTORED:
    case NotificationType.CASE_ASSIGNED:
      return `${StatusBgClass.SUCCESS} ${StatusTextClass.SUCCESS}`
    case NotificationType.CASE_STATUS_CHANGED:
      return `${StatusBgClass.WARNING} ${StatusTextClass.WARNING}`
    case NotificationType.CASE_UNASSIGNED:
      return `${StatusBgClass.WARNING} ${StatusTextClass.WARNING}`
    case NotificationType.TENANT_ASSIGNED:
    case NotificationType.CASE_COMMENT_ADDED:
    case NotificationType.CASE_TASK_ADDED:
    case NotificationType.CASE_ARTIFACT_ADDED:
    case NotificationType.CASE_UPDATED:
      return `${StatusBgClass.INFO} ${StatusTextClass.INFO}`
    case NotificationType.ROLE_CHANGED:
      return `${StatusBgClass.WARNING} ${StatusTextClass.WARNING}`
    default:
      return `${StatusBgClass.PRIMARY_10} ${StatusTextClass.PRIMARY}`
  }
}
