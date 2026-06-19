export function setCookie(name: string, value: string, maxAgeSeconds = 31536000): void {
  if (typeof document === 'undefined') {
    return
  }
  document.cookie = `${name}=${value};path=/;max-age=${String(maxAgeSeconds)};SameSite=Lax`
}

export function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trimStart()
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length))
    }
  }
  return ''
}
