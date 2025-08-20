"use client"
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, ExternalLink, Download, Trash2, Loader2, QrCode, MoreHorizontal, Maximize2 } from 'lucide-react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useState, useEffect, useRef } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export interface TableEntity { id: number; table_number: number; qr_code: string }

interface TableCardProps {
  table: TableEntity
  index: number
  qrCodeData?: string
  texts: { tableNumber: string; generatingQR: string; edit: string; viewMenu: string; download: string; delete: string; deleteConfirm: string; deleteDescription: string; cancel: string }
  onEdit(table: TableEntity): void
  onOpenMenu(url: string): void
  onDownload(table: TableEntity): void
  onDelete(id: number): void
  deleting: boolean
  disabled?: boolean
}

export function TableCard({ table, index, qrCodeData, texts, onEdit, onOpenMenu, onDownload, onDelete, deleting, disabled }: TableCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handle(e: Event) {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handle as EventListener, true)
    document.addEventListener('touchstart', handle as EventListener, true)
    return () => {
      document.removeEventListener('mousedown', handle as EventListener, true)
      document.removeEventListener('touchstart', handle as EventListener, true)
    }
  }, [menuOpen])
  return (
    <>
      <Card className="group border border-slate-200/60 hover:shadow-lg transition-all duration-200 bg-white/80 hover:bg-white animate-fade-in-up relative overflow-hidden" style={{ animationDelay: `${index * 0.07}s` }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-primary/5 to-primary/10 transition-opacity" />
        <CardHeader className="pb-2 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                {texts.tableNumber} {table.table_number}
              </CardTitle>
              <button
                type="button"
                onClick={()=> qrCodeData && setPreviewOpen(true)}
                className="mt-3 relative group/qr rounded-xl border border-slate-200 bg-white p-2 hover:border-blue-300 hover:shadow-md transition-all w-28 h-28 flex items-center justify-center"
              >
                {qrCodeData ? (
                  <Image src={qrCodeData} alt={`QR ${table.table_number}`} width={104} height={104} className="w-24 h-24" />
                ) : (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                )}
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/qr:bg-black/5 flex items-center justify-center transition-colors">
                  {qrCodeData && <Maximize2 className="w-4 h-4 text-slate-600 opacity-0 group-hover/qr:opacity-100 transition-opacity" />}
                </div>
              </button>
            </div>
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-200 hover:bg-slate-50"
                onClick={()=> setMenuOpen(o=> !o)}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-md z-20 p-1 animate-in fade-in-0 zoom-in-95">
                  <button disabled={disabled} onClick={()=> { onEdit(table); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-50 text-left">
                    <Edit className="w-4 h-4 text-blue-600" /> {texts.edit}
                  </button>
                  <button onClick={()=> { onOpenMenu(table.qr_code); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-50 text-left">
                    <ExternalLink className="w-4 h-4" /> {texts.viewMenu}
                  </button>
                  <button disabled={!qrCodeData} onClick={()=> { onDownload(table); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-50 text-left disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4" /> {texts.download}
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button disabled={deleting} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-50 text-left text-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {texts.delete}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{texts.deleteConfirm}</AlertDialogTitle>
                        <AlertDialogDescription>{texts.deleteDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-200 hover:bg-slate-50">{texts.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={()=> { onDelete(table.id); setMenuOpen(false) }} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md">
                          {texts.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4 relative z-10">
          {!qrCodeData && (
            <div className="flex flex-col items-start gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          )}
        </CardContent>
      </Card>
  <Dialog open={previewOpen} onOpenChange={(o: boolean)=> setPreviewOpen(o)}>
        <DialogContent className="w-[92vw] sm:max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200">
            <QrCode className="w-6 h-6 text-blue-700" />
          </div>
          {qrCodeData ? (
            <Image src={qrCodeData} alt={`QR ${table.table_number}`} width={240} height={240} className="w-60 h-60 rounded-xl border border-slate-200 bg-white p-4 shadow" />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          )}
          <div className="flex gap-3 w-full pt-2">
            <Button variant="outline" className="flex-1" onClick={()=> setPreviewOpen(false)}>{texts.cancel}</Button>
            <Button className="flex-1" onClick={()=> { onDownload(table); }} disabled={!qrCodeData}>
              <Download className="w-4 h-4 mr-2" /> {texts.download}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
