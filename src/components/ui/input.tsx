import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onWheel, onFocus, onChange, ...props }, ref) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (type === "number" || type === "password" || props.inputMode === "numeric" || props.inputMode === "decimal") {
        e.currentTarget.select();
      }
      onFocus?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "number" || props.inputMode === "numeric" || props.inputMode === "decimal") {
        let val = e.target.value;
        if (val.length > 1 && /^0[0-9]/.test(val)) {
          val = val.replace(/^0+/, '');
          e.target.value = val;
        }
      }
      onChange?.(e);
    };

    return (
      <input
        type={type}
        onWheel={(e) => {
          if (type === "number") {
            e.currentTarget.blur();
          }
          onWheel?.(e);
        }}
        onFocus={handleFocus}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
