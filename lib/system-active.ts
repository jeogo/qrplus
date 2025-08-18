"use client"

export function handleSystemInactive(language: 'ar' | 'fr') {
  try {
    localStorage.setItem('system_active', 'false')
    window.dispatchEvent(new Event('systemActiveChange'))
  } catch {}
  const msg = language === 'ar'
    ? 'النظام متوقف حالياً. لا يمكن تنفيذ هذا الإجراء.'
    : 'Le système est arrêté. Action impossible.'
  try {
    // Fallback simple custom event; actual UI toasts can listen if needed
    window.dispatchEvent(new CustomEvent('systemInactiveNotice', { detail: { message: msg } }))
  } catch {}
  return msg
}

export function recordSystemActive(active: boolean) {
  try {
    localStorage.setItem('system_active', String(active))
    window.dispatchEvent(new Event('systemActiveChange'))
  } catch {}
}
