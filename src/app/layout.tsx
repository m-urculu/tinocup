// @file src/app/layout.tsx
// @description Root layout — dark FIFA theme, fonts, Toaster

import type { Metadata, Viewport } from "next"
import { Inter, Bebas_Neue } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
})

const bebasNeue = Bebas_Neue({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TinoCup",
  description: "Football group hub — manage games, stats, teams & payments",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0e1a",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt" className="dark">
      <body
        className={`${inter.variable} ${bebasNeue.variable} font-sans antialiased min-h-screen`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
