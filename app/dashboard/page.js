"use client"
import { useEffect, useState } from "react"

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch("/api/bots/start")
      .then(res => res.json())
      .then(setData)
  }, [])

  return (
    <div>
      <h1>AutoTrade Cloud</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
