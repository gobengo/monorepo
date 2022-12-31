export const as2ContextUri = "https://www.w3.org/ns/activitystreams" as const;
type ActivityStreams2ContextUri = typeof as2ContextUri

type As2Type<TypeString> = TypeString | [TypeString, ...unknown[]]

export interface IActor<Type extends string> {
  "@context": ActivityStreams2ContextUri | [ActivityStreams2ContextUri, ...unknown[]],
  type: As2Type<Type>
  id: URL,
  url: URL,
  inbox: URL,
  outbox: URL,

  name?: string,
}
