"use client";
import { memo } from 'react'
import { Star } from 'lucide-react'
import { ShimmerSkeleton } from './ShimmerSkeleton'
import { PublicCategory } from '../hooks/use-public-order-session'
import { PublicMenuTexts } from '@/lib/i18n/public-menu'

interface CategoryGridProps {
	categories: PublicCategory[]
	loading: boolean
	error: string | null
	t: PublicMenuTexts
	onRetry: () => void
	onSelect: (id:number)=>void
}

export const CategoryGrid = memo(function CategoryGrid({ categories, loading, error, t, onRetry, onSelect }: CategoryGridProps) {
	return (
		<div className="mb-8 space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold tracking-tight">{t.categories}</h2>
				<div className="text-xs text-muted-foreground">{categories.length} {t.categories}</div>
			</div>
			{error && (
				<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
					<p className="text-sm text-destructive mb-3">{error}</p>
					<button onClick={onRetry} className="text-xs font-medium text-destructive underline">
						{t.retry}
					</button>
				</div>
			)}
			{!error && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{loading && !categories.length && [...Array(8)].map((_, i) => (
						<div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-sm p-0">
							<ShimmerSkeleton className="h-28 w-full rounded-none" />
							<ShimmerSkeleton className="mx-auto my-3 h-4 w-24" />
						</div>
					))}
					{!loading && categories.map((c,i)=>(
						<button
							key={c.id}
							onClick={()=>onSelect(c.id)}
							className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md shadow-md hover:shadow-lg transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/40"
							style={{ animationDelay: `${i*40}ms` }}
						>
							<div className="relative h-28 w-full overflow-hidden">
								{c.image_url ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={c.image_url} alt={c.name} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
								) : (
									<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/30 via-muted/50 to-background">
										<Star className="h-7 w-7 text-muted-foreground/40" />
									</div>
								)}
								<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
							</div>
							<div className="p-3">
								<h3 className="text-sm font-medium text-foreground line-clamp-1 text-center tracking-wide">{c.name}</h3>
							</div>
						</button>
					))}
				</div>
			)}
			{!loading && !error && categories.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-white/60 dark:bg-white/5 backdrop-blur-md p-8 text-center">
					<Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
					<p className="text-muted-foreground">{t.noCategories}</p>
				</div>
			)}
		</div>
	)
})

