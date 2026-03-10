"use client"

// @file src/components/InviteCodeButton.tsx
// @description Copy invite code to clipboard button

import { Copy, Check } from "lucide-react"
import { useState } from "react"

export function InviteCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="glass rounded-lg p-2 hover:bg-white/10 transition-colors"
    >
      {copied ? (
        <Check className="size-5 text-green-400" />
      ) : (
        <Copy className="size-5 text-muted-foreground" />
      )}
    </button>
  )
}
