"use client"

import * as React from "react"
import { Check, Leaf, Monitor, Moon, Sun, Waves } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "green", label: "Forest", icon: Leaf },
  { value: "blue", label: "Ocean", icon: Waves },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto shrink-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t, i) => (
          <React.Fragment key={t.value}>
            {t.value === "system" && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => setTheme(t.value)}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2">
                <t.icon className="h-4 w-4" />
                {t.label}
              </span>
              {theme === t.value && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
