import { AuthGuard } from '@/components/common'
import { RoleGuard } from '@/components/common'
import { PortalShell } from '@/components/layout'

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthGuard>
      <PortalShell>
        <RoleGuard>{children}</RoleGuard>
      </PortalShell>
    </AuthGuard>
  )
}
