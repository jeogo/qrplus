"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Tablet, Monitor, Check, AlertCircle } from "lucide-react"

interface ResponsiveTestProps {
  className?: string
}

export function ResponsiveTest({ className = "" }: ResponsiveTestProps) {
  const [currentView, setCurrentView] = useState<"mobile" | "tablet" | "desktop">("mobile")

  const breakpoints = [
    {
      name: "Mobile",
      id: "mobile" as const,
      icon: Smartphone,
      width: "375px",
      description: "iPhone SE / Small phones",
      features: [
        "Bottom navigation visible",
        "Single column layout",
        "Touch-friendly buttons (min 44px)",
        "Stacked form elements",
        "Collapsible header elements",
      ],
    },
    {
      name: "Tablet",
      id: "tablet" as const,
      icon: Tablet,
      width: "768px",
      description: "iPad / Medium tablets",
      features: [
        "2-column grid layouts",
        "Expanded header with more info",
        "Side-by-side form elements",
        "Larger touch targets",
        "Bottom nav with labels",
      ],
    },
    {
      name: "Desktop",
      id: "desktop" as const,
      icon: Monitor,
      width: "1024px+",
      description: "Laptop / Desktop screens",
      features: [
        "3+ column grid layouts",
        "Full header with all elements",
        "Horizontal form layouts",
        "Hover effects enabled",
        "Optimized for mouse interaction",
      ],
    },
  ]

  const responsiveChecklist = [
    {
      category: "Layout",
      items: [
        "Grid adapts from 1 → 2 → 3+ columns",
        "Cards stack properly on mobile",
        "Header elements collapse appropriately",
        "Bottom navigation remains accessible",
        "Content doesn't overflow horizontally",
      ],
    },
    {
      category: "Typography",
      items: [
        "Text scales appropriately (16px+ on mobile)",
        "Line heights maintain readability",
        "Headings use responsive sizing",
        "Arabic/French text renders correctly",
        "Numbers display in English format",
      ],
    },
    {
      category: "Interactions",
      items: [
        "Touch targets ≥ 44px on mobile",
        "Buttons have adequate spacing",
        "Form inputs are easily tappable",
        "Hover effects disabled on touch devices",
        "Swipe gestures work where applicable",
      ],
    },
    {
      category: "Navigation",
      items: [
        "Bottom nav icons remain visible",
        "Active states clearly indicated",
        "Language switcher accessible",
        "Back buttons work consistently",
        "Deep linking functions properly",
      ],
    },
    {
      category: "Performance",
      items: [
        "Animations respect reduced motion",
        "Images load efficiently",
        "Critical CSS loads first",
        "Touch interactions feel responsive",
        "No layout shift during load",
      ],
    },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Breakpoint Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Responsive Design Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {breakpoints.map((bp) => {
              const Icon = bp.icon
              return (
                <Button
                  key={bp.id}
                  variant={currentView === bp.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentView(bp.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {bp.name}
                </Button>
              )
            })}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{breakpoints.find((bp) => bp.id === currentView)?.name}</h3>
              <Badge variant="outline">{breakpoints.find((bp) => bp.id === currentView)?.width}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {breakpoints.find((bp) => bp.id === currentView)?.description}
            </p>
            <ul className="space-y-1">
              {breakpoints
                .find((bp) => bp.id === currentView)
                ?.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-600" />
                    {feature}
                  </li>
                ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {responsiveChecklist.map((section, index) => (
          <Card key={index} className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {section.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm">
                    <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Responsive Grid Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Grid Layout Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="bg-primary/10 p-4 rounded-lg text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-2xl font-bold text-primary mb-2">{i + 1}</div>
                <div className="text-sm text-muted-foreground">Grid Item</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Touch Target Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Touch Target Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-[44px] min-w-[44px]">
                Small
              </Button>
              <Button size="default" className="min-h-[44px]">
                Default
              </Button>
              <Button size="lg" className="min-h-[44px]">
                Large
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              All buttons meet the minimum 44px touch target requirement for mobile accessibility.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
