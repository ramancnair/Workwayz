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
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = themes.find((t) => t.value === theme) || themes[0]
  const ActiveIcon = currentTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto shrink-0">
          {mounted ? (
            <ActiveIcon className="h-4 w-4 transition-all" />
          ) : (
            <Sun className="h-4 w-4 transition-all" />
          )}
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
