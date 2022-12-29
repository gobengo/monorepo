import { createMockOutbox, Outbox } from "./outbox.js"

type UUID = string

export type Actor = {
  type: "Actor"
  uuid: UUID
  outbox: Outbox
}

export function createMockActor({
  uuid = `uuid-${Math.random().toString().slice(2)}`,
  outbox = createMockOutbox(),
}={}): Actor {
  return {
    type: "Actor",
    uuid,
    outbox,
  }
}
