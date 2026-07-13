import { useEffect, useState } from "react"

function getCompactMode() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(max-width: 860px), (pointer: coarse) and (max-width: 1180px)").matches
}

export function useCompactMode() {
  const [compact, setCompact] = useState(getCompactMode)

  useEffect(() => {
    const query = window.matchMedia("(max-width: 860px), (pointer: coarse) and (max-width: 1180px)")
    const updateMode = () => setCompact(query.matches)

    updateMode()
    query.addEventListener("change", updateMode)

    return () => {
      query.removeEventListener("change", updateMode)
    }
  }, [])

  return compact
}
