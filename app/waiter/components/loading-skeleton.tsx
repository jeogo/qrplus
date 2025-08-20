"use client"
import { Card, CardContent } from '@/components/ui/card'

export function WaiterLoadingSkeleton(){
  return (
    <div className="space-y-4">
      {[1,2,3].map(i=> (
        <Card key={i} className="shadow-sm border-slate-200">
          <CardContent className="p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-6 bg-slate-200 rounded w-16"/>
                <div className="h-4 bg-slate-200 rounded w-20"/>
              </div>
              <div className="h-6 bg-slate-200 rounded w-16"/>
            </div>
            <div className="space-y-3 mb-4">
              <div className="h-4 bg-slate-200 rounded w-24"/>
              <div className="space-y-2">
                <div className="h-12 bg-slate-200 rounded"/>
                <div className="h-12 bg-slate-200 rounded"/>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-16"/>
                <div className="h-6 bg-slate-200 rounded w-24"/>
              </div>
            </div>
            <div className="h-10 bg-slate-200 rounded"/>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
