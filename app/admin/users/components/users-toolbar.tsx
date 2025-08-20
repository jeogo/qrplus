"use client"
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, RefreshCcw, X } from 'lucide-react'

export interface UsersToolbarProps {
  onAdd: () => void
  onRefresh: () => void
  onSearch: (value: string) => void
  texts: { search: string; add: string; refresh: string; clear: string }
  debounce?: number
}

export function UsersToolbar({ onAdd, onRefresh, onSearch, texts, debounce = 400 }: UsersToolbarProps){
  const [value, setValue] = useState('')
  const debounced = useRef<any>(null)
  useEffect(()=>{
    clearTimeout(debounced.current)
    debounced.current = setTimeout(()=> onSearch(value.trim()), debounce)
    return () => clearTimeout(debounced.current)
  }, [value])
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
      <div className="relative flex-1 max-w-sm">
        <Input placeholder={texts.search} value={value} onChange={e=>setValue(e.target.value)} className="pe-8" />
        {value && <button onClick={()=>setValue('')} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRefresh} size="sm" className="gap-1">
          <RefreshCcw className="h-4 w-4" />
          <span className="hidden sm:inline">{texts.refresh}</span>
        </Button>
        <Button onClick={onAdd} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />{texts.add}
        </Button>
      </div>
    </div>
  )
}
