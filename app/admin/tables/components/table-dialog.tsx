"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface TableDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  onConfirm(numberValue: number, mode: 'add' | 'edit'): void
  editing?: boolean
  adding?: boolean
  initialNumber?: number | null
  texts: { addTable: string; editTable: string; tableNumber: string; tableName: string; save: string; cancel: string; adding: string; updating: string; instructions?: string }
}

export function TableDialog({ open, onOpenChange, onConfirm, editing, adding, initialNumber, texts }: TableDialogProps) {
  const [value, setValue] = useState(initialNumber ? String(initialNumber) : '')
  const isEdit = initialNumber != null

  // reset when open changes to true and initialNumber differs
  const handleChangeOpen = (o: boolean) => {
    if (!o) {
      setValue('')
    } else if (initialNumber) {
      setValue(String(initialNumber))
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleChangeOpen}>
      <DialogContent className="w-[90vw] sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? texts.editTable : texts.addTable}</DialogTitle>
          <DialogDescription>
            {texts.instructions || ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="tableNumberField" className="font-medium text-sm text-slate-700">{texts.tableName}</Label>
            <Input
              id="tableNumberField"
              type="number"
              value={value}
              onChange={(e)=> setValue(e.target.value)}
              placeholder={texts.tableNumber}
              disabled={adding || editing}
              className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={()=> handleChangeOpen(false)} disabled={adding||editing} className="border-slate-200 hover:bg-slate-50">{texts.cancel}</Button>
            <Button onClick={()=> { if(!value.trim()) return; const num = Number(value); if(!Number.isInteger(num) || num < 1) return; onConfirm(num, isEdit? 'edit':'add') }} disabled={adding||editing || !value.trim()} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md">
              {(adding || editing) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {adding ? texts.adding : editing ? texts.updating : texts.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
