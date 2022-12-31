import { as2ContextUri, IActor } from "./actor.js";

export interface IMastodonActorRequirements {
  preferredUsername: string,
}

export function createPersonActor(options: {
  id: URL,
  preferredUsername?: string,
  inbox: URL,
  outbox: URL,
}): IActor<"Person"> & IMastodonActorRequirements {
  const personEntity: IActor<"Person"> & IMastodonActorRequirements = {
    "@context": [
      as2ContextUri,
      "https://w3id.org/security/v1"
    ],
    type: 'Person' as const,
    id: options.id,
    url: options.id,
    preferredUsername: options.preferredUsername || 'default',
    name: 'Anonymous',
    inbox: options.inbox,
    outbox: options.outbox,
  };
  return personEntity
}
