// @file src/app/profile/setup/page.tsx
// @description Server wrapper — forces dynamic rendering for client form
// @depends app/profile/setup/ProfileSetupForm

export const dynamic = "force-dynamic"

import ProfileSetupForm from "./ProfileSetupForm"

export default function ProfileSetupPage() {
  return <ProfileSetupForm />
}
