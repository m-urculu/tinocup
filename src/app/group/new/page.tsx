// @file src/app/group/new/page.tsx
// @description Server wrapper — forces dynamic rendering for client form
// @depends app/group/new/NewGroupForm

export const dynamic = "force-dynamic"

import NewGroupForm from "./NewGroupForm"

export default function NewGroupPage() {
  return <NewGroupForm />
}
