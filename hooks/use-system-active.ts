"use client"
import { useEffect, useState } from 'react'

export function useSystemActive(defaultValue: boolean = true) {
  const [active, setActive] = useState<boolean>(defaultValue)

  useEffect(() => {
    const read = () => {
      try {
        const v = localStorage.getItem('system_active')
        if (v === 'true') setActive(true)
        else if (v === 'false') setActive(false)
      } catch {}
    }
    read()
    const handler = () => read()
  window.addEventListener('systemActiveChange', handler as EventListener)
  return () => window.removeEventListener('systemActiveChange', handler as EventListener)
  }, [])

  return active
}
