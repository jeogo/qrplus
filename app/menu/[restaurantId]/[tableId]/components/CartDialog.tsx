"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShoppingCart, Minus, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PublicMenuTexts } from '@/lib/i18n/public-menu'
import { CartItem } from '../hooks/use-public-order-session'

interface CartDialogProps {
	open: boolean
	onOpenChange: (v:boolean)=>void
	cart: CartItem[]
	t: PublicMenuTexts
	language: 'ar'|'fr'|'en'
	currency: string
	cartCount: number
	cartTotal: number
	orderNote: string
	onChangeNote: (v:string)=>void
	onDec: (id:number)=>void
	onInc: (id:number)=>void
	onRemove: (id:number)=>void
	onSubmit: ()=>void
	submitting: boolean
	canOrder: boolean
}

export function CartDialog({ open, onOpenChange, cart, t, language, currency, cartCount, cartTotal, orderNote, onChangeNote, onDec, onInc, onRemove, onSubmit, submitting, canOrder }: CartDialogProps){
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md max-h-[85vh] overflow-hidden border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 rounded-xl shadow-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShoppingCart className="w-5 h-5" />
						{t.cart} ({cartCount} {t.items})
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col max-h-[60vh] overflow-hidden">
					{cart.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<div className="relative w-16 h-16 mx-auto mb-4">
								<div className="absolute inset-0 rounded-full bg-background/80 animate-ping opacity-75" />
								<div className="relative flex items-center justify-center w-16 h-16 bg-background rounded-full border border-border/60">
									<ShoppingCart className="w-8 h-8 text-muted-foreground/70" />
								</div>
							</div>
							<p>{t.empty}</p>
						</div>
					) : (
						<>
							<div className="space-y-2 flex-1 overflow-y-auto mb-4 pr-1">
								{cart.map((item, index) => (
									<div
										key={item.id}
										className="flex items-center gap-3 p-3 border border-border/60 rounded-xl bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-all duration-200"
										style={{ animationDelay: `${index*40}ms` }}
									>
										{item.image && (
											<div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/40">
												<Image src={item.image} alt={item.name_ar} fill className="object-cover" />
											</div>
										)}
										<div className="flex-1 min-w-0">
											<h4 className="font-medium text-sm text-foreground truncate">
												{language==='ar'? (item.name_ar||item.name_en) : language==='fr'? (item.name_fr||item.name_en) : (item.name_en||item.name_fr||item.name_ar)}
											</h4>
											<p className="text-xs text-muted-foreground tabular-nums">{item.price} {currency}</p>
										</div>
										<div className="flex items-center gap-1">
											<Button size="sm" variant="outline" aria-label={t.decrease} onClick={()=>onDec(item.id)} className="h-7 w-7 p-0 rounded-full">
												<Minus className="w-3 h-3" />
											</Button>
											<span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
											<Button size="sm" variant="outline" aria-label={t.increase} onClick={()=>onInc(item.id)} className="h-7 w-7 p-0 rounded-full">
												<Plus className="w-3 h-3" />
											</Button>
										</div>
										<Button size="sm" variant="ghost" onClick={()=>onRemove(item.id)} className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
											<Trash2 className="w-3 h-3" />
										</Button>
									</div>
								))}
							</div>
							<div className="mb-4">
								<Label className="text-sm font-medium text-foreground/90 mb-1 block">{t.orderNote}</Label>
								<Textarea value={orderNote} onChange={(e)=>onChangeNote(e.target.value)} placeholder={t.addNote} className="w-full text-sm resize-none border-border/60 rounded-lg bg-background/80" rows={2} />
							</div>
							<div className="border-t border-border/60 pt-4 space-y-3">
								<div className="flex items-center justify-between mb-2">
									<span className="font-medium text-foreground">{t.total}:</span>
									<span className="font-bold text-lg text-foreground tabular-nums">{cartTotal} {currency}</span>
								</div>
								<Button onClick={onSubmit} disabled={submitting || !canOrder} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 rounded-xl">
									{submitting ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t.loading}</>) : (<><CheckCircle className="w-5 h-5 mr-2" /> {t.orderNow}</>)}
								</Button>
							</div>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

