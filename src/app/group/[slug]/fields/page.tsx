"use client"

// @file src/app/group/[slug]/fields/page.tsx
// @description Field management — add/edit fields (name, address, price)
// @depends lib/supabase/client

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react"
import type { Field } from "@/types"

export default function FieldsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()
  const supabase = createClient()

  const [groupId, setGroupId] = useState<string | null>(null)
  const [fields, setFields] = useState<Field[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [price, setPrice] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      // Resolve slug → UUID
      const { data: group } = await supabase
        .from("groups")
        .select("id")
        .eq("slug", slug)
        .single()

      if (!group) return
      setGroupId(group.id)
      loadFields(group.id)
    }
    init()
  }, [slug, supabase])

  async function loadFields(gid?: string) {
    const id = gid ?? groupId
    if (!id) return
    const { data } = await supabase
      .from("fields")
      .select("*")
      .eq("group_id", id)
      .order("name")
    if (data) setFields(data)
  }

  function startEdit(field: Field) {
    setEditing(field.id)
    setName(field.name)
    setAddress(field.address ?? "")
    setPrice(field.price_per_hour.toString())
    setShowForm(true)
  }

  function resetForm() {
    setEditing(null)
    setName("")
    setAddress("")
    setPrice("")
    setShowForm(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !price || !groupId) return

    setLoading(true)

    if (editing) {
      const { error } = await supabase
        .from("fields")
        .update({
          name: name.trim(),
          address: address.trim() || null,
          price_per_hour: parseFloat(price),
        })
        .eq("id", editing)

      if (error) toast.error(error.message)
      else toast.success("Campo atualizado")
    } else {
      const { error } = await supabase.from("fields").insert({
        group_id: groupId,
        name: name.trim(),
        address: address.trim() || null,
        price_per_hour: parseFloat(price),
      })

      if (error) toast.error(error.message)
      else toast.success("Campo adicionado")
    }

    setLoading(false)
    resetForm()
    loadFields()
  }

  async function handleDelete(fieldId: string) {
    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("id", fieldId)

    if (error) toast.error(error.message)
    else {
      toast.success("Campo eliminado")
      loadFields()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Campos</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg gradient-gold px-3 py-1.5 text-sm font-bold text-black hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* --- Add/Edit Form --- */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="glass rounded-xl p-4 space-y-3"
        >
          <Input
            placeholder="Nome do campo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 bg-white/5 border-white/10"
          />
          <Input
            placeholder="Morada (opcional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-10 bg-white/5 border-white/10"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Preço por hora"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 bg-white/5 border-white/10"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || !name.trim() || !price}
              className="flex-1 gradient-gold text-black font-bold hover:opacity-90"
            >
              {loading ? "A guardar..." : editing ? "Atualizar" : "Adicionar Campo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              className="text-muted-foreground"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* --- Field List --- */}
      {fields.length === 0 && !showForm ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Ainda sem campos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{field.name}</p>
                  {field.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" />
                      {field.address}
                    </p>
                  )}
                  <p className="text-sm text-gold mt-1">
                    €{field.price_per_hour}/h
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(field)}
                    className="size-7 rounded-lg glass flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="size-7 rounded-lg glass flex items-center justify-center text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
