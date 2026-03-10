// @file src/app/group/[id]/layout.tsx
// @description Group layout — fetches group data, wraps children with nav
// @depends lib/supabase/server, components/layout/GroupLayout

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroupLayout } from "@/components/layout/GroupLayout"

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", id)
    .single()

  if (!group) notFound()

  return (
    <GroupLayout groupId={group.id} groupName={group.name}>
      {children}
    </GroupLayout>
  )
}
