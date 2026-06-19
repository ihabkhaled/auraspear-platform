'use client'

import { Shield, Eye, EyeOff, Sun, Moon, Languages } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useLoginPage } from '@/hooks'
import { LOCALES } from '@/lib/constants/locales'

export default function LoginPage() {
  const {
    t,
    tApp,
    tLang,
    tCommon,
    mounted,
    isDark,
    currentLocale,
    handleThemeToggle,
    handleLocaleChange,
    isLoading,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    handleSubmit,
  } = useLoginPage()

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute end-3 top-3 flex items-center gap-1 sm:end-4 sm:top-4 sm:gap-2">
        <Select value={currentLocale} onValueChange={handleLocaleChange}>
          <SelectTrigger size="sm" className="w-[110px] gap-1 sm:w-[130px]">
            <Languages className="text-muted-foreground h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map(l => (
              <SelectItem key={l.code} value={l.code}>
                {tLang(l.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            aria-label={isDark ? tCommon('lightMode') : tCommon('darkMode')}
          >
            {isDark ? (
              <Sun className="text-muted-foreground h-4 w-4" />
            ) : (
              <Moon className="text-muted-foreground h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="bg-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Shield className="text-primary-foreground h-6 w-6" />
          </div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            {tApp('name')}
          </p>
          <CardTitle className="text-xl">{t('welcomeBack')}</CardTitle>
          <CardDescription>{t('signInDescription')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@aura-finance.io"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.currentTarget.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.currentTarget.value)}
                  className="pe-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="text-muted-foreground hover:text-foreground absolute end-3 top-1/2 -translate-y-1/2"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('signingIn') : t('signInButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
