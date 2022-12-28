type UUID = string
export type Actor = { uuid: UUID }

export function createMockActor(): Actor {
  return {
    uuid: `uuid-${Math.random().toString().slice(2)}`,
  }
}