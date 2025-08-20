"use client"
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Loader2, Image as ImageIcon } from 'lucide-react'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { memo } from 'react'
import { Category } from './types'
import { StatusBadge } from './status-badge'

interface CategoryCardProps {
  category: Category
  productCount: number
  deleting: boolean
  texts: { active:string; inactive:string; products:string; deleteConfirmTitle?:string; deleteConfirmDescription?:string; confirm?:string; cancel?:string; editLabel?:string; deleteLabel?:string }
  onEdit: (c: Category)=>void
  onDelete: (id:number)=>void
  onSelect: (id:number)=>void
}

export const CategoryCard = memo(function CategoryCard({ category, productCount, deleting, texts, onEdit, onDelete, onSelect }: CategoryCardProps) {
  return (
    <Card className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white ring-1 ring-transparent transition-all hover:border-blue-300 hover:shadow-md hover:ring-blue-100" onClick={()=> onSelect(category.id)}>
      <div className="relative z-10 p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {category.image_url ? (
            <Image src={category.image_url} alt={category.name} width={320} height={180} className="w-full sm:w-20 sm:h-20 h-40 rounded-xl object-cover border border-slate-200 shadow-sm bg-slate-50" />
          ) : (
            <div className="w-full sm:w-20 sm:h-20 h-40 rounded-xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
              <ImageIcon className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1.5 self-stretch flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 truncate" dir="auto">{category.name}</h3>
            <p className="text-[12px] leading-snug text-slate-500 line-clamp-2 min-h-[30px]" dir="auto">{category.description}</p>
            {/* mobile spacer */}
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between text-[11px]">
            <StatusBadge label={category.active ? texts.active : texts.inactive} state={category.active? 'on':'off'} />
            <span className="text-slate-400 font-medium">{productCount} {texts.products}</span>
          </div>
          <div className="flex gap-2" onClick={e=> e.stopPropagation()}>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 flex items-center gap-1" onClick={()=> onEdit(category)} aria-label="edit">
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
                  <AlertDialogAction onClick={()=> onDelete(category.id)} className="bg-red-600 hover:bg-red-700 text-white">
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
