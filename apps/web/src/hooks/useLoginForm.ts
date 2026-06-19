import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { getErrorKey } from '@/lib/api-error'
import { authService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useLoginForm() {
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { setTokens, setUser, setPermissions } = useAuthStore()
  const { setCurrentTenant, setUserTenants } = useTenantStore()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    queryClient.clear()

    authService
      .login(email, password)
      .then(data => {
        setTokens(data.accessToken)
        setUser(data.user)
        setPermissions(data.permissions ?? [])
        setCurrentTenant(data.user.tenantId)
        setUserTenants(data.tenants)
        router.push('/dashboard')
      })
      .catch((error: unknown) => {
        const key = getErrorKey(error)
        Toast.error(tErrors(key))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return {
    isLoading,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    handleSubmit,
  }
}
