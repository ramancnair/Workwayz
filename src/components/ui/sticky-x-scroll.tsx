"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Wraps a wide table and docks a horizontal scrollbar to the bottom of the
 * visible area, so sideways scrolling is possible without first scrolling
 * down to the end of a long table. The bar only shows when the content
 * overflows horizontally and stays in sync with the content's scroll position.
 *
 * The wrapped <Table> should use wrapperClassName="overflow-visible" so this
 * component (not the table wrapper) is the horizontal scroll container.
 */
export function StickyXScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const barRef = React.useRef<HTMLDivElement>(null)
  const spacerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const content = contentRef.current
    const bar = barRef.current
    const spacer = spacerRef.current
    if (!content || !bar || !spacer) return

    const measure = () => {
      spacer.style.width = `${content.scrollWidth}px`
      bar.style.display = content.scrollWidth > content.clientWidth + 1 ? "block" : "none"
    }
    const onContentScroll = () => {
      if (bar.scrollLeft !== content.scrollLeft) bar.scrollLeft = content.scrollLeft
    }
    const onBarScroll = () => {
      if (content.scrollLeft !== bar.scrollLeft) content.scrollLeft = bar.scrollLeft
    }

    // ResizeObserver reports once on observe(), so no synchronous measure is needed.
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    const table = content.querySelector("table")
    if (table) observer.observe(table)

    content.addEventListener("scroll", onContentScroll, { passive: true })
    bar.addEventListener("scroll", onBarScroll, { passive: true })
    return () => {
      observer.disconnect()
      content.removeEventListener("scroll", onContentScroll)
      bar.removeEventListener("scroll", onBarScroll)
    }
  }, [])

  return (
    <div className={cn("relative w-full", className)}>
      <div ref={contentRef} data-testid="sticky-x-content" className="sticky-x-content w-full overflow-x-auto">
        {children}
      </div>
      <div
        ref={barRef}
        data-testid="sticky-x-bar"
        className="sticky-x-bar sticky bottom-0 z-20 overflow-x-auto overflow-y-hidden border-t bg-card"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
    </div>
  )
}

