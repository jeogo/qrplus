"use client"
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { Product } from './types'
import { memo } from 'react'
import { StatusBadge } from './status-badge'

interface ProductCardProps {
  product: Product
  deleting: boolean
  onEdit: (p: Product)=>void
  onDelete: (id:number)=>void
  formatPrice: (n:number)=>string
  texts: { available:string; unavailable:string; deleteConfirmTitle?:string; deleteConfirmDescription?:string; confirm?:string; cancel?:string; editLabel?:string; deleteLabel?:string }
}

export const ProductCard = memo(function ProductCard({ product, deleting, onEdit, onDelete, formatPrice, texts }: ProductCardProps) {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white ring-1 ring-transparent transition-all hover:border-blue-300 hover:ring-blue-100 hover:shadow-md">
      <div className="relative z-10 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} width={320} height={180} className="w-full sm:w-20 sm:h-20 h-40 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-50" />
          ) : (
            <div className="w-full sm:w-20 sm:h-20 h-40 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
              <ImageIcon className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5 self-stretch flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 truncate" dir="auto">{product.name}</h3>
            <p className="text-[12px] leading-snug text-slate-500 line-clamp-2 min-h-[30px]" dir="auto">{product.description}</p>
            {/* mobile spacer */}
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-600">{formatPrice(product.price)}</span>
            <StatusBadge label={product.available ? texts.available : texts.unavailable} state={product.available? 'on':'off'} />
          </div>
          <div className="flex gap-2" onClick={e=> e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 flex items-center gap-1" onClick={()=> onEdit(product)} aria-label="edit">
              <Edit className="h-4 w-4" /> <span className="text-[12px] font-medium">{texts.editLabel || 'Edit'}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-red-700 hover:border-red-300 flex items-center gap-1" disabled={deleting} aria-label="delete">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="text-[12px] font-medium">{texts.deleteLabel || 'Delete'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{texts.deleteConfirmTitle || 'Confirm'}</AlertDialogTitle>
                  {texts.deleteConfirmDescription && (
                    <AlertDialogDescription>{texts.deleteConfirmDescription}</AlertDialogDescription>
                  )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{texts.cancel || 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction onClick={()=> onDelete(product.id)} className="bg-red-600 hover:bg-red-700 text-white">
                    {texts.confirm || 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  )
})
