import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bell,
  Crosshair,
  ArrowRightLeft,
  Database,
  DollarSign,
  Briefcase,
  Globe,
  Settings,
  Server,
  Plug,
  Compass,
  ShieldAlert,
  GitBranch,
  Bug,
  Activity,
  Bot,
  Clock3,
  FileCheck,
  BarChart3,
  Brain,
  Route,
  Workflow,
  Layers,
  ShieldCheck,
  Cloud,
  Cable,
  FlaskConical,
  Lock,
  UsersRound,
  BookOpen,
  History,
  MessageSquare,
  Network,
  PlayCircle,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSidebarHealth } from '@/hooks'
import { canAccessRouteByPermission } from '@/lib/permissions'
import { useUIStore, useAuthStore } from '@/stores'
import type { NavSection } from '@/types'

export function useSidebarContent() {
  const pathname = usePathname()
  const t = useTranslations()
  const { toggleSidebar } = useUIStore()
  const permissions = useAuthStore(s => s.permissions)
  const user = useAuthStore(s => s.user)
  const canViewSystemHealth =
    permissions.length > 0 ? canAccessRouteByPermission(permissions, '/system-health') : false
  const { healthPercent, servicesOnline, totalServices, maxLatencyMs } =
    useSidebarHealth(canViewSystemHealth)

  const allSections: NavSection[] = [
    {
      label: t('nav.overview'),
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
        { icon: Globe, label: t('nav.msspDashboard'), href: '/dashboard/mssp' },
        { icon: Bell, label: t('nav.alerts'), href: '/alerts' },
        { icon: ShieldAlert, label: t('nav.incidents'), href: '/incidents' },
      ],
    },
    {
      label: t('nav.detectionAnalysis'),
      items: [
        { icon: GitBranch, label: t('nav.correlation'), href: '/correlation' },
        { icon: Crosshair, label: t('nav.hunt'), href: '/hunt' },
        { icon: Bug, label: t('nav.vulnerabilities'), href: '/vulnerabilities' },
        { icon: Brain, label: t('nav.ueba'), href: '/ueba' },
        { icon: Route, label: t('nav.attackPath'), href: '/attack-paths' },
        { icon: Layers, label: t('nav.normalization'), href: '/normalization' },
        { icon: ShieldCheck, label: t('nav.rulesEngine'), href: '/detection-rules' },
      ],
    },
    {
      label: t('nav.intelligenceResponse'),
      items: [
        { icon: Globe, label: t('nav.intel'), href: '/intel' },
        { icon: Briefcase, label: t('nav.cases'), href: '/cases' },
        { icon: Compass, label: t('nav.explorer'), href: '/explorer' },
        { icon: Network, label: t('nav.entities'), href: '/entities' },
      ],
    },
    {
      label: t('nav.infrastructure'),
      items: [
        { icon: Plug, label: t('nav.connectors'), href: '/connectors' },
        { icon: Cable, label: t('nav.llmConnectors'), href: '/connectors/llm' },
        { icon: Activity, label: t('nav.systemHealth'), href: '/system-health' },
        { icon: Clock3, label: t('nav.jobs'), href: '/jobs' },
        { icon: Cloud, label: t('nav.cloudSecurity'), href: '/cloud-security' },
      ],
    },
    {
      label: t('nav.aiAutomation'),
      items: [
        { icon: Activity, label: t('nav.aiOps'), href: '/ai-ops' },
        { icon: Sparkles, label: t('nav.aiFindings'), href: '/ai-findings' },
        { icon: MessageSquare, label: t('nav.aiChat'), href: '/ai-chat' },
        { icon: Bot, label: t('nav.aiAgents'), href: '/ai-agents' },
        { icon: Settings2, label: t('nav.aiConfig'), href: '/ai-config' },
        { icon: History, label: t('nav.aiHistory'), href: '/ai-history' },
        { icon: DollarSign, label: t('nav.aiFinops'), href: '/ai-finops' },
        { icon: ArrowRightLeft, label: t('nav.aiHandoffs'), href: '/ai-handoffs' },
        { icon: Brain, label: t('nav.aiMemory'), href: '/ai-memory' },
        { icon: Database, label: t('nav.aiRag'), href: '/ai-rag' },
        { icon: ShieldCheck, label: t('nav.aiTranscripts'), href: '/ai-transcripts' },
        { icon: FlaskConical, label: t('nav.aiEval'), href: '/ai-eval' },
        { icon: PlayCircle, label: t('nav.aiSimulations'), href: '/ai-simulations' },
        { icon: Search, label: t('nav.aiSearch'), href: '/ai-search' },
        { icon: Network, label: t('nav.aiAgentGraph'), href: '/ai-agent-graph' },
        { icon: Workflow, label: t('nav.soar'), href: '/soar' },
      ],
    },
    {
      label: t('nav.governance'),
      items: [
        { icon: BookOpen, label: t('nav.knowledge'), href: '/knowledge' },
        { icon: FileCheck, label: t('nav.compliance'), href: '/compliance' },
        { icon: BarChart3, label: t('nav.reports'), href: '/reports' },
        { icon: Settings, label: t('nav.tenantConfig'), href: '/admin/tenant' },
        { icon: Server, label: t('nav.systemAdmin'), href: '/admin/system' },
        { icon: Lock, label: t('nav.roleSettings'), href: '/admin/role-settings' },
        { icon: UsersRound, label: t('nav.usersControl'), href: '/admin/users-control' },
      ],
    },
  ]

  // Filter sections and items based on user permissions
  const sections = user
    ? allSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => canAccessRouteByPermission(permissions, item.href)),
        }))
        .filter(section => section.items.length > 0)
    : allSections

  return {
    pathname,
    t,
    toggleSidebar,
    sections,
    healthPercent,
    servicesOnline,
    totalServices,
    maxLatencyMs,
    canViewSystemHealth,
  }
}

export function useSidebarShell() {
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()

  return { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen }
}
