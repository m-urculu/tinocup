"use client"

// @file src/app/group/[slug]/games/new/page.tsx
// @description Create a new game — date picker, time selector, field, team size
// @depends app/group/[slug]/games/new/actions, components/ui/calendar, components/ui/popover

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { createGame } from "./actions"

// --- Constants ---

const TIME_OPTIONS = [
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30", "22:00",
]

// --- Component ---

export default function NewGamePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()
  const supabase = createClient()

  const [groupId, setGroupId] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState("20:00")
  const [teamSize, setTeamSize] = useState(5)
  const [locationName, setLocationName] = useState("")
  const [loading, setLoading] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)

  // Resolve slug → UUID
  useEffect(() => {
    async function resolveGroup() {
      const { data } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", slug)
        .single()
      if (data) setGroupId(data.id)
    }
    resolveGroup()
  }, [slug, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !groupId) return

    setLoading(true)

    const result = await createGame(groupId, {
      date: format(date, "yyyy-MM-dd"),
      time,
      teamSize,
      locationName,
    })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success("Jogo criado!")
    router.push(`/group/${slug}/games/${result.gameId}`)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Novo Jogo</h2>

      <form onSubmit={handleSubmit} className="glass rounded-xl p-5 space-y-5">
        {/* --- Date --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Data
          </label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              className="flex h-11 w-full items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground"
            >
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
            <PopoverTrigger
              className="flex h-11 w-full items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground"
            >
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

        {/* --- Team Size --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Tamanho da equipa
          </label>
          <div className="flex gap-2">
            {[5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTeamSize(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  teamSize === n
                    ? "gradient-gold text-black"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}v{n}
              </button>
            ))}
          </div>
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
          disabled={loading || !date || !groupId}
          className="w-full h-12 gradient-gold text-black font-bold text-base hover:opacity-90 transition-opacity"
        >
          {loading ? "A criar..." : "Criar Jogo"}
        </Button>
      </form>
    </div>
  )
}
