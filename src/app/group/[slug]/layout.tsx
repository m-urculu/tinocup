// @file src/app/group/[slug]/layout.tsx
// @description Group layout — fetches group by slug, wraps children with nav
// @depends lib/supabase/server, components/layout/GroupLayout

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroupLayout } from "@/components/layout/GroupLayout"

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!group) notFound()

  return (
    <GroupLayout groupSlug={slug} groupName={group.name}>
      {children}
    </GroupLayout>
  )
}
