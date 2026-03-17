"use client"

// @file src/app/group/[slug]/games/[gameId]/edit/page.tsx
// @description Edit game form — date, time, location (creator only, upcoming games)
// @depends app/group/[slug]/games/[gameId]/actions, components/ui/calendar, components/ui/popover

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { CalendarIcon, Clock, ArrowLeft } from "lucide-react"
import { format, parse } from "date-fns"
import { updateGame } from "../actions"
import Link from "next/link"

// --- Constants ---

const TIME_OPTIONS = [
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00",
]

// --- Component ---

export default function EditGamePage() {
  const params = useParams<{ slug: string; gameId: string }>()
  const { slug, gameId } = params
  const router = useRouter()
  const supabase = createClient()

  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("20:00")
  const [locationName, setLocationName] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  // Fetch current game data
  useEffect(() => {
    async function fetchGame() {
      const { data: game } = await supabase
        .from("games")
        .select("date, time, field_id")
        .eq("id", gameId)
        .single()

      if (game) {
        setDate(parse(game.date, "yyyy-MM-dd", new Date()))
        setTime(game.time ?? "20:00")

        if (game.field_id) {
          const { data: field } = await supabase
            .from("fields")
            .select("name")
            .eq("id", game.field_id)
            .single()
          if (field) setLocationName(field.name)
        }
      }

      setFetching(false)
    }
    fetchGame()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return

    setLoading(true)

    const result = await updateGame(gameId, slug, {
      date: format(date, "yyyy-MM-dd"),
      time,
      locationName,
    })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Jogo atualizado!")
    router.push(`/group/${slug}/games/${gameId}`)
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        A carregar...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/group/${slug}/games/${gameId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h2 className="text-xl font-semibold">Editar Jogo</h2>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-xl p-5 space-y-5">
        {/* --- Date --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Data
          </label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger className="flex h-11 w-full items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">
              <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
              {date ? (
                format(date, "EEE, dd MMM yyyy")
              ) : (
                <span className="text-muted-foreground">Escolher data</span>
              )}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d)
                  setCalendarOpen(false)
                }}
                disabled={{ before: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* --- Time --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Hora
          </label>
          <Popover open={timeOpen} onOpenChange={setTimeOpen}>
            <PopoverTrigger className="flex h-11 w-full items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">
              <Clock className="mr-2 size-4 text-muted-foreground" />
              {time}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-1">
              <div className="grid grid-cols-3 gap-1">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTime(t)
                      setTimeOpen(false)
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      time === t
                        ? "gradient-gold text-black"
                        : "hover:bg-white/10 text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* --- Location --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Local
          </label>
          <Input
            placeholder="ex. Soccer Planet, Rodovia..."
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="h-11 bg-white/5 border-white/10"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !date}
          className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
        >
          {loading ? "A guardar..." : "Guardar Alterações"}
        </Button>
      </form>
    </div>
  )
}
