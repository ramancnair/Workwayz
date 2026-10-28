'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoveHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TableScrollContextType {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  hasOverflow: boolean;
  scrollPercentage: number;
  scrollLeft: () => void;
  scrollRight: () => void;
  scrollToStart: () => void;
  scrollToEnd: () => void;
}

const TableScrollContext = React.createContext<TableScrollContextType | null>(null);

export function useTableScroll() {
  const context = React.useContext(TableScrollContext);
  return context;
}

interface TableScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scrollStep?: number;
  showStickyBar?: boolean;
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  label?: string;
}

export function TableScrollContainer({
  children,
  scrollStep = 280,
  showStickyBar = true,
  wrapperRef: externalWrapperRef,
  className,
  label = 'Table columns',
  ...props
}: TableScrollContainerProps) {
  const localWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const activeWrapperRef = externalWrapperRef || localWrapperRef;
  const stickyScrollRef = React.useRef<HTMLDivElement | null>(null);
  const dummyTrackRef = React.useRef<HTMLDivElement | null>(null);
  const isInteractingWithMirror = React.useRef(false);

  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [scrollPercentage, setScrollPercentage] = React.useState(0);

  const checkScrollState = () => {
    const el = activeWrapperRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth: sWidth, clientWidth } = el;
    const maxScroll = Math.max(0, sWidth - clientWidth);
    const overflow = sWidth > clientWidth + 4;

    setHasOverflow(overflow);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < maxScroll - 4);
    setScrollPercentage(maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * 100) : 0);

    // Update mirror width on the dummy div via DOM
    if (dummyTrackRef.current) {
      dummyTrackRef.current.style.width = `${sWidth}px`;
    }

    // Sync sticky mirror bar scroll position if present and user is not actively dragging it
    if (stickyScrollRef.current && !isInteractingWithMirror.current) {
      stickyScrollRef.current.scrollLeft = scrollLeft;
    }
  };

  React.useEffect(() => {
    const el = activeWrapperRef.current;
    if (!el) return;

    checkScrollState();

    const handleContainerScroll = () => {
      checkScrollState();
    };

    el.addEventListener('scroll', handleContainerScroll, { passive: true });
    window.addEventListener('resize', checkScrollState, { passive: true });
    window.addEventListener('scroll', checkScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      checkScrollState();
    });
    resizeObserver.observe(el);

    const tableEl = el.querySelector('table');
    if (tableEl) {
      resizeObserver.observe(tableEl);
    }

    return () => {
      el.removeEventListener('scroll', handleContainerScroll);
      window.removeEventListener('resize', checkScrollState);
      window.removeEventListener('scroll', checkScrollState);
      resizeObserver.disconnect();
    };
  });

  const handleStickyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isInteractingWithMirror.current) return;
    const target = e.currentTarget;
    const el = activeWrapperRef.current;
    if (!el) return;
    el.scrollLeft = target.scrollLeft;
  };

  const handleScrollLeft = () => {
    const el = activeWrapperRef.current;
    if (!el) return;
    el.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    const el = activeWrapperRef.current;
    if (!el) return;
    el.scrollBy({ left: scrollStep, behavior: 'smooth' });
  };

  const handleScrollToStart = () => {
    const el = activeWrapperRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const handleScrollToEnd = () => {
    const el = activeWrapperRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  };

  const contextValue: TableScrollContextType = {
    canScrollLeft,
    canScrollRight,
    hasOverflow,
    scrollPercentage,
    scrollLeft: handleScrollLeft,
    scrollRight: handleScrollRight,
    scrollToStart: handleScrollToStart,
    scrollToEnd: handleScrollToEnd,
  };

  return (
    <TableScrollContext.Provider value={contextValue}>
      <div className={cn('relative w-full flex flex-col', className)} {...props}>
        {/* Main Content (Table) */}
        {children}

        {/* Sticky Horizontal Scrollbar Bar */}
        {hasOverflow && showStickyBar && (
          <div
            className={cn(
              'sticky bottom-0 z-30 w-full transition-all duration-200',
              'bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.15)]',
              'px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs select-none'
            )}
          >
            <div className="flex items-center gap-2 text-muted-foreground shrink-0 font-medium">
              <MoveHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px]">
                {label} ({scrollPercentage}%)
              </span>
            </div>

            {/* Direct interactive horizontal scroll track */}
            <div
              ref={stickyScrollRef}
              onScroll={handleStickyScroll}
              onPointerDown={() => {
                isInteractingWithMirror.current = true;
              }}
              onPointerUp={() => {
                isInteractingWithMirror.current = false;
              }}
              onPointerLeave={() => {
                isInteractingWithMirror.current = false;
              }}
              className="flex-1 overflow-x-auto overflow-y-hidden py-1 px-1 max-w-full rounded bg-muted/30 border border-border/40 max-h-5"
              title="Drag or scroll horizontally to explore all columns"
            >
              <div ref={dummyTrackRef} className="h-1.5" />
            </div>

            {/* Left / Right Quick Buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollToStart}
                disabled={!canScrollLeft}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Scroll to start"
                aria-label="Scroll to start"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                className="h-7 px-2 text-xs gap-1 font-medium hover:bg-muted"
                title="Scroll left"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Left</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                className="h-7 px-2 text-xs gap-1 font-medium hover:bg-muted"
                title="Scroll right"
                aria-label="Scroll right"
              >
                <span className="hidden sm:inline">Right</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScrollToEnd}
                disabled={!canScrollRight}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Scroll to end"
                aria-label="Scroll to end"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </TableScrollContext.Provider>
  );
}

/**
 * Compact header control buttons that can be placed in any CardHeader
 */
export function TableScrollHeaderControls({ className }: { className?: string }) {
  const scrollState = useTableScroll();
  if (!scrollState || !scrollState.hasOverflow) return null;

  return (
    <div className={cn('flex items-center gap-1 shrink-0', className)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollState.scrollLeft}
              disabled={!scrollState.canScrollLeft}
              className="h-7 w-7 p-0 border-border/80 hover:bg-muted/60"
              aria-label="Scroll table left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Scroll table left</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollState.scrollRight}
              disabled={!scrollState.canScrollRight}
              className="h-7 w-7 p-0 border-border/80 hover:bg-muted/60"
              aria-label="Scroll table right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Scroll table right</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
