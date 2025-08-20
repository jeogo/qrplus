"use client"
import { Check } from 'lucide-react'

interface PermissionItemProps { label: string; active: boolean }

function PermissionItem({ label, active }: PermissionItemProps){
  return (
    <li className="flex items-center gap-2 text-xs sm:text-sm py-1 opacity-90">
      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${active? 'bg-primary text-primary-foreground border-primary':'border-border text-muted-foreground'}`}>{active && <Check className="w-3 h-3" />}</span>
      <span>{label}</span>
    </li>
  )
}

export interface PermissionsListProps {
  perms: { key: string; label: string; active: boolean }[]
}

export function PermissionsList({ perms }: PermissionsListProps){
  return (
    <ul className="grid grid-cols-2 gap-x-4">
      {perms.map(p => <PermissionItem key={p.key} label={p.label} active={p.active} />)}
    </ul>
  )
}
