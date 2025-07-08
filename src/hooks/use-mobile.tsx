import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    // Run on mount
    checkIsMobile()
    // Add listener for resize
    window.addEventListener("resize", checkIsMobile)
    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return isMobile
}
