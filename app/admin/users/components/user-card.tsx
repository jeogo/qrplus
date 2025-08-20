"use client"
import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { RoleBadge } from './role-badge'
import { PermissionsList } from './permissions-list'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface UserCardProps {
  user: any
  onEdit: (user: any) => void
  onDelete: (user: any) => void
  isEditing?: boolean
  texts: {
    waiter: string
    kitchen: string
    edit: string
    del: string
    permissions: string
  }
}

export function UserCard({ user, onEdit, onDelete, isEditing, texts }: UserCardProps){
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState(!!user.__flash)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  // Reset flash when __flash flag changes
  useEffect(()=>{ if(user.__flash){ setFlash(true); const t = setTimeout(()=> setFlash(false), 1500); return ()=> clearTimeout(t) } }, [user.__flash, user.id])

  useEffect(() => {
    function handle(e: MouseEvent){
      if(!menuRef.current) return
      if(!menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape') setOpen(false)
    }
    if(open){
      document.addEventListener('mousedown', handle)
      document.addEventListener('keydown', onKey)
    }
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', onKey) }
  }, [open])

  const username = user.username || user.name || user.displayName || '—'
  const meta = user.email || user.phone || ''
  const initials = (username || 'U').slice(0,2).toUpperCase()

  return (
    <div
      className={cn(
        'relative group rounded-xl border p-4 flex flex-col gap-4 shadow-sm transition-all duration-300 ring-offset-2 bg-gradient-to-br from-white to-slate-50/70 dark:from-slate-800 dark:to-slate-900 hover:shadow-md hover:-translate-y-0.5 focus-within:shadow-md',
        isEditing && 'ring-2 ring-primary/60',
        flash && 'flash-highlight'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-brand-soft flex items-center justify-center text-xs font-semibold text-brand ring-1 ring-brand/30">
            {user.active === false ? (
              <span className="opacity-50">{initials}</span>
            ) : initials}
          </div>
          {user.active === false && (
            <span className="absolute -bottom-1 -end-1 rounded-full bg-destructive text-[8px] px-1 py-0.5 text-white font-medium">off</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-medium leading-tight truncate flex items-center gap-1.5">
              {username}
              {user.permissions?.approve_orders && <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{meta}</p>
          <div className="mt-2"><RoleBadge role={user.role} waiterLabel={texts.waiter} kitchenLabel={texts.kitchen} /></div>
        </div>
        <div className="ms-auto" ref={menuRef}>
          <Button ref={btnRef} aria-haspopup="menu" aria-expanded={open} size="icon" variant="ghost" className="h-8 w-8 -me-1" onClick={()=> setOpen(o=>!o)}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">actions</span>
          </Button>
          {open && (
            <div
              role="menu"
              className="absolute z-30 mt-2 end-0 w-40 rounded-md border bg-popover/95 backdrop-blur shadow-lg p-1 text-sm origin-top-right animate-in fade-in zoom-in-95"
            >
              <button
                role="menuitem"
                onClick={()=>{setOpen(false); onEdit(user)}}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-accent focus:bg-accent focus:outline-none"
              >
                <Pencil className="h-3.5 w-3.5" /> {texts.edit}
              </button>
              <button
                role="menuitem"
                onClick={()=>{setOpen(false); onDelete(user)}}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-destructive/10 focus:bg-destructive/10 text-destructive focus:outline-none"
              >
                <Trash2 className="h-3.5 w-3.5" /> {texts.del}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Permissions */}
      <div>
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">{texts.permissions}</p>
        <div className="rounded-lg bg-muted/40 p-2">
          <PermissionsList perms={user._derivedPermissions || []} />
        </div>
      </div>
    </div>
  )
}
