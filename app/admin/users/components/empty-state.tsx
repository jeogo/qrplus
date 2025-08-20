"use client"
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function UsersEmptyState({ title, description, cta, onAdd }:{ title:string; description:string; cta:string; onAdd:()=>void }){
  return (
    <div className="text-center py-20 bg-white rounded-xl border border-slate-200/50 shadow-sm">
      <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      <Button onClick={onAdd} className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">{cta}</Button>
    </div>
  )
}
