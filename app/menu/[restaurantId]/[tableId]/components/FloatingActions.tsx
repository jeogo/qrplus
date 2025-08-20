"use client";
import { Button } from '@/components/ui/button'
import { ShoppingCart, ChefHat } from 'lucide-react'
import { memo } from 'react'

interface FloatingActionsProps {
	cartCount: number
	hasActiveOrder: boolean
	onOpenCart: ()=>void
	onOpenTracker: ()=>void
}

export const FloatingActions = memo(function FloatingActions({ cartCount, hasActiveOrder, onOpenCart, onOpenTracker }: FloatingActionsProps){
	return (
		<div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
			{hasActiveOrder && (
				<Button onClick={onOpenTracker} className="rounded-full w-14 h-14 p-0 shadow-lg relative bg-primary text-primary-foreground hover:shadow-xl hover:scale-105 active:scale-95 transition-all" aria-label="order tracker">
					<ChefHat className="w-5 h-5" />
					<div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-primary animate-ping"></div>
					<div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
				</Button>
			)}
			{cartCount > 0 && (
				<Button onClick={onOpenCart} className="rounded-full w-14 h-14 p-0 shadow-lg relative bg-primary text-primary-foreground hover:shadow-xl hover:scale-105 active:scale-95 transition-all" aria-label="open cart">
					<ShoppingCart className="w-5 h-5" />
					<span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">{cartCount}</span>
				</Button>
			)}
		</div>
	)
})

