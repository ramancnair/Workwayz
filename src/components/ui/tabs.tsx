"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "folder" | "underline"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      variant === "default" && "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      variant === "folder" && "w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-1 flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden items-end",
      variant === "underline" && "w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-4 flex",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "default" | "folder" | "underline"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "cursor-pointer data-[state=active]:cursor-default data-[state=active]:pointer-events-none select-none transition-all",
      variant === "default" && "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-emerald-500/40 data-[state=active]:shadow-sm hover:text-emerald-600 dark:hover:text-emerald-300",
      variant === "folder" && "relative inline-flex items-center justify-center whitespace-nowrap rounded-t-md rounded-b-none border border-b-0 border-transparent px-3.5 py-1.5 text-xs md:text-sm font-medium text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-300 hover:bg-muted/30 data-[state=active]:border-border data-[state=active]:border-t-2 data-[state=active]:border-t-emerald-500 data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold data-[state=active]:shadow-none -mb-px transition-colors focus-visible:outline-none",
      variant === "underline" && "relative inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-300 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:font-semibold -mb-px transition-colors focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
