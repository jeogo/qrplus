"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface SaveConfirmDialogProps {
  open: boolean
  loading: boolean
  onCancel(): void
  onConfirm(): void
  texts: { confirmSaveTitle: string; confirmSaveDescription: string; cancel: string; confirm: string }
}

export function SaveConfirmDialog({ open, loading, onCancel, onConfirm, texts }: SaveConfirmDialogProps) {
  return (
  <Dialog open={open} onOpenChange={(o: boolean)=> { if(!loading && !o) onCancel() }}>
      <DialogContent className="w-[90vw] sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{texts.confirmSaveTitle}</DialogTitle>
          <DialogDescription>{texts.confirmSaveDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" disabled={loading} onClick={onCancel} className="border-slate-200 hover:bg-slate-50">{texts.cancel}</Button>
          <Button disabled={loading} onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {texts.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
