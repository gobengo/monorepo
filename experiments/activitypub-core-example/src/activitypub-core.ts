import type * as APC from "activitypub-core-types";
import { ActorType, ActorTypeString } from "./activitystreams2";

export type APCoreActor<TypeString extends ActorTypeString = ActorTypeString> = Omit<APC.AP.Actor, 'type'> & {
  // the activitypub-core-types Actor['type'] is weird and hard to assign to, so use this instead
  type: ActorType<TypeString>
}
