"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * DialogContent — flex-column layout with sticky header/footer.
 * Content between DialogHeader and DialogFooter is automatically wrapped
 * in a scrollable padded container. Use max-h-[Xvh] on DialogContent to
 * control the max height.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    bypassScrollWrapper?: boolean;
  }
>(({ className, children, bypassScrollWrapper = false, ...props }, ref) => {
  if (bypassScrollWrapper) {
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 overflow-hidden sm:rounded-lg" +
            " data-[state=open]:animate-in data-[state=closed]:animate-out" +
            " data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" +
            " data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" +
            " data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]" +
            " data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }

  // Separate header/footer (sticky) from body content (scrollable+padded)
  const header: React.ReactNode[] = [];
  const footer: React.ReactNode[] = [];
  const body: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      body.push(child);
      return;
    }
    const displayName =
      (child.type as any)?.displayName ||
      (child.type as any)?.name ||
      "";
    if (displayName === "DialogHeader") header.push(child);
    else if (displayName === "DialogFooter") footer.push(child);
    else body.push(child);
  });

  const hasHeader = header.length > 0;
  const hasFooter = footer.length > 0;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 flex flex-col w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 overflow-hidden sm:rounded-lg" +
          " data-[state=open]:animate-in data-[state=closed]:animate-out" +
          " data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" +
          " data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95" +
          " data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]" +
          " data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        {...props}
      >
        {header}
        {body.length > 0 && (
          <div className={cn(
            "flex-1 overflow-y-auto px-6",
            hasHeader || hasFooter ? "py-4" : "py-6"
          )}>
            {body}
          </div>
        )}
        {footer}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * DialogBody — explicit scrollable body wrapper (optional, same as the auto-wrapper).
 * Use when you need custom className on the scroll container.
 */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

/**
 * DialogHeader — sticky at the top, with the close button integrated on the right.
 */
const DialogHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky top-0 z-10 flex flex-row items-start justify-between gap-4 bg-background px-6 py-4 border-b shrink-0",
      className
    )}
    {...props}
  >
    <div className="flex flex-col space-y-1 min-w-0 flex-1 text-left">
      {children}
    </div>
    <DialogPrimitive.Close className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none mt-0.5">
      <X className="h-3.5 w-3.5" />
      <span className="sr-only">Close</span>
    </DialogPrimitive.Close>
  </div>
)
DialogHeader.displayName = "DialogHeader"

/**
 * DialogFooter — sticky at the bottom, with a top border.
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "sticky bottom-0 bg-background border-t px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 shrink-0",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
