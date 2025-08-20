"use client";
import { useState, memo } from 'react'
import { ArrowLeft, Star, Plus, Minus, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { PublicMenuTexts } from '@/lib/i18n/public-menu'
import { PublicProduct } from '../hooks/use-public-order-session'
import { ShimmerSkeleton } from './ShimmerSkeleton'
import { Button } from '@/components/ui/button'

interface ProductGridProps {
	products: PublicProduct[]
	loading: boolean
	error: string | null
	t: PublicMenuTexts
	currency: string
	language: 'ar'|'fr'
	onRetry: () => void
	onBack: () => void
	onAdd: (p:PublicProduct)=>void
	onInc: (id:number)=>void
	onDec: (id:number)=>void
	addingId: number | null
	inCartQty: (id:number)=> number
}

export const ProductGrid = memo(function ProductGrid({ products, loading, error, t, currency, language, onRetry, onBack, onAdd, onInc, onDec, addingId, inCartQty }: ProductGridProps){
	const [search, setSearch] = useState('')
	const filtered = products.filter(p => {
		const base = (language==='ar' ? (p.name_ar||p.name) : (p.name_fr||p.name)) || ''
		return !search || base.toLowerCase().includes(search.toLowerCase())
	})
	return (
		<div className="mb-10 space-y-4 animate-fadeIn" style={{ animationDelay: '80ms' }}>
			<div className="flex items-center gap-3">
				<button onClick={onBack} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-primary/10 text-primary font-medium">
					<ArrowLeft className="w-4 h-4" /> {t.backToCategories}
				</button>
				<h2 className="text-lg font-semibold tracking-tight">{t.products}</h2>
			</div>
			<div className="relative">
				<input
					value={search}
					onChange={e=> setSearch(e.target.value)}
					placeholder={language==='ar'? 'بحث...' : 'Rechercher...'}
					className="w-full rounded-xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 pl-10"
				/>
				<div className="absolute left-3 top-3.5 text-muted-foreground/70">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
				</div>
			</div>
			{error && (
				<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
					<p className="text-sm text-destructive mb-3">{error}</p>
					<button onClick={onRetry} className="text-xs font-medium text-destructive underline">Retry</button>
				</div>
			)}
			{!error && (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{loading && !products.length && [...Array(6)].map((_,i)=>(
						<div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-4">
							<ShimmerSkeleton className="h-40 w-full rounded-xl mb-3" />
							<div className="mt-3 space-y-3">
								<ShimmerSkeleton className="h-4 w-3/4" />
								<ShimmerSkeleton className="h-3 w-full" />
								<div className="flex justify-between items-center pt-2">
									<ShimmerSkeleton className="h-4 w-16" />
									<ShimmerSkeleton className="h-8 w-20 rounded-full" />
								</div>
							</div>
						</div>
					))}
					{!loading && filtered.map((p,i)=>{
						const qty = inCartQty(p.id)
						return (
							<div key={p.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-md hover:shadow-xl transition-all focus-within:ring-2 focus-within:ring-primary/40" style={{ animationDelay: `${i*40}ms` }}>
								<div className="relative h-40 w-full overflow-hidden">
									{p.image_url ? (
										<Image src={p.image_url} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
									) : (
										<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 via-muted/50 to-background">
											<Star className="h-8 w-8 text-muted-foreground/40" />
										</div>
									)}
									{p.available === false && (
										<div className="absolute inset-0 backdrop-blur-[3px] bg-background/70 flex items-center justify-center">
											<span className="rounded-full bg-destructive/90 px-4 py-1.5 text-xs font-medium text-destructive-foreground tracking-wide shadow-md">{currency==='د.ج' ? 'غير متوفر' : 'Unavailable'}</span>
										</div>
									)}
								</div>
								<div className="flex flex-1 flex-col p-4 gap-3">
									<div className="space-y-1.5">
										<h3 className="text-sm font-semibold text-foreground line-clamp-1 tracking-tight">{language==='ar' ? (p.name_ar||p.name) : (p.name_fr||p.name)}</h3>
										{p.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{p.description}</p>}
									</div>
									<div className="mt-auto flex items-center justify-between gap-2">
										<span className="text-sm font-semibold tabular-nums">{p.price} {currency}</span>
										{qty > 0 ? (
											<div className="flex items-center gap-2">
												<Button size="sm" variant="outline" onClick={()=>onDec(p.id)} aria-label="decrease" className="h-8 w-8 p-0 rounded-full"> 
													<Minus className="h-3 w-3" /> 
												</Button>
												<span className="text-sm font-medium w-6 text-center select-none tabular-nums">{qty}</span>
												<Button size="sm" variant="outline" onClick={()=>onInc(p.id)} aria-label="increase" className="h-8 w-8 p-0 rounded-full"> 
													<Plus className="h-3 w-3" /> 
												</Button>
											</div>
										) : (
											<Button size="sm" onClick={()=>onAdd(p)} disabled={addingId===p.id || p.available===false} className="h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
												{addingId===p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
												<span className="text-xs">{currency==='د.ج' ? 'إضافة' : 'Ajouter'}</span>
											</Button>
										)}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md p-8 text-center">
					<Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
					<p className="text-muted-foreground">No products found.</p>
				</div>
			)}
		</div>
	)
})

