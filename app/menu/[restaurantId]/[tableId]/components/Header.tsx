"use client";
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Globe, ShoppingCart, ChefHat, Star } from 'lucide-react'
import { PublicMenuTexts } from '@/lib/i18n/public-menu'
import { RestaurantMeta } from '../hooks/use-public-order-session'
import { memo } from 'react'

interface HeaderProps {
	meta: RestaurantMeta | null
	restaurantId: string
	tableId: string
	t: PublicMenuTexts
	onToggleLanguage: () => void
	cartCount: number
	hasActiveOrder: boolean
	onOpenCart: () => void
	onOpenTracker: () => void
}

export const Header = memo(function Header({ meta, restaurantId, tableId, t, onToggleLanguage, cartCount, hasActiveOrder, onOpenCart, onOpenTracker }: HeaderProps) {
	return (
		<header className="sticky top-0 z-50 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 bg-background/85 border-b border-border/40 shadow-sm">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
				<div className="flex items-center gap-3 min-w-0">
					{meta?.logo_url ? (
						<div className="relative h-12 w-12 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm">
							<Image src={meta.logo_url} alt="logo" fill className="object-cover" />
						</div>
					) : (
						<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-muted shadow-sm">
							<Star className="h-6 w-6 text-muted-foreground/50" />
						</div>
					)}
					<div className="truncate">
						<h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg truncate">
							{meta?.restaurant_name || `Restaurant ${restaurantId}`}
						</h1>
						<p className="text-xs text-muted-foreground">{t.table} {tableId}</p>
					</div>
				</div>
				<div className="flex gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={onToggleLanguage}
							aria-label="toggle language"
							className="rounded-full h-10 w-10 hover:bg-primary/10"
						>
							<Globe className="w-5 h-5" />
						</Button>
						{hasActiveOrder && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onOpenTracker}
								className="relative h-10 w-10 rounded-full hover:bg-primary/10"
								aria-label="order tracker"
							>
								<ChefHat className="w-5 h-5" />
								<span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
								<span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
							</Button>
						)}
						{cartCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onOpenCart}
								className="relative h-10 w-10 rounded-full hover:bg-primary/10"
								aria-label="open cart"
							>
								<ShoppingCart className="w-5 h-5" />
								<span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
									{cartCount}
								</span>
							</Button>
						)}
				</div>
			</div>
		</header>
	)
})

