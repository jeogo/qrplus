"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChefHat, Clock, CheckCircle, ChefHat as PreparingIcon, Star, Truck } from 'lucide-react'
import { PublicMenuTexts } from '@/lib/i18n/public-menu'
import { Order } from '../hooks/use-public-order-session'
import { memo } from 'react'

const ORDER_STATUSES: Order['status'][] = ['pending','accepted','preparing','ready','served']

interface OrderTrackerDialogProps {
	open:boolean
	onOpenChange:(v:boolean)=>void
	orders: Order[]
	t: PublicMenuTexts
	currency?: string
}

const StatusIcon = ({ status }: { status: Order['status'] }) => {
	const icons = {
		pending: <Clock className="w-5 h-5" />,
		accepted: <CheckCircle className="w-5 h-5" />,
		preparing: <PreparingIcon className="w-5 h-5" />,
		ready: <Star className="w-5 h-5" />,
		served: <Truck className="w-5 h-5" />
	}
	return icons[status]
}

export const OrderTrackerDialog = memo(function OrderTrackerDialog({ open, onOpenChange, orders, t, currency }: OrderTrackerDialogProps){
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 rounded-xl shadow-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ChefHat className="w-5 h-5" /> {t.orderStatus}
					</DialogTitle>
				</DialogHeader>
				{orders.length>0 && (
					<div className="space-y-6">
						{orders.map(order => (
							<div key={order.id} className="space-y-4">
								<div className="flex items-center justify-center py-3">
									<div className="flex items-center">
										{ORDER_STATUSES.filter(s=> s!=='served').map((status, index)=>{
											const isActive = order.status === status
											const isPassed = ORDER_STATUSES.indexOf(order.status) > index
											return (
												<div key={status} className="flex items-center">
													<div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs transition-all ${isActive? 'bg-primary text-primary-foreground shadow-md animate-pulse': isPassed? 'bg-primary/80 text-primary-foreground':'bg-muted text-muted-foreground'}`}>
														<StatusIcon status={status} />
													</div>
													{index < ORDER_STATUSES.filter(s=> s!=='served').length -1 && (
														<div className={`w-5 h-0.5 mx-1 ${isPassed? 'bg-primary/80':'bg-muted'}`} />
													)}
												</div>
											)
										})}
									</div>
								</div>
								<div className="text-center p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/60">
									<h3 className="font-semibold text-foreground mb-1">{t[order.status as keyof typeof t] as string ?? order.status}</h3>
									<p className="text-muted-foreground text-sm">{t.statusMessages[order.status]}</p>
								</div>
								{order.items && order.items.length>0 && (
									<div className="space-y-2">
										<h4 className="font-medium text-foreground text-sm tracking-tight">{t.orderItems}</h4>
										{order.items.map(it=> (
											<div key={it.product_id} className="flex justify-between text-sm p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-border/30">
												<span>{it.product_name} <span className="text-muted-foreground">×{it.quantity}</span></span>
												<span className="font-medium tabular-nums">{(it.price * it.quantity).toFixed(2)} {currency}</span>
											</div>
										))}
										<div className="border-t border-border/60 pt-3 mt-3 flex justify-between font-semibold">
											<span>{t.total}:</span>
											<span className="tabular-nums text-lg">{order.total_amount} {currency}</span>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
})

