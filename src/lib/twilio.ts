// @file src/lib/twilio.ts
// @description Thin Twilio wrapper for sending SMS messages.

import twilio from "twilio"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function sendSMS(to: string, body: string) {
  return client.messages.create({
    to,
    from: "TINOCUP",
    body,
  })
}
