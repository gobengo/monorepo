/**
 * canonical rfc6838 media type for activitystreams2
 */
export const mediaType = 'application/activity+json' as const

export type ActorTypeString = "Application" | "Group" | "Organization" | "Person" | "Service"
export type ActorType<TypeString extends ActorTypeString = ActorTypeString> = As2TypeValue<TypeString>

export const ActorTypeStrings: ActorTypeString[] = ['Application', 'Group', 'Organization', 'Person', 'Service']

/**
 * canonical json-ld @context URL for activitystreams2
 */
export const contextUrl = "https://www.w3.org/ns/activitystreams" as const

export type As2TypeValue<Type> = Type | [Type, ...string[]]

type ObjectWithType<TypeString extends string> = {
  type: As2TypeValue<TypeString>
}

/**
 * test whether the provided as2 object has an expected type value.
 * Checks as2 objects whose type property has an array value.
 */
export function hasActivityStreams2Type<TypeString extends string>(
  object: ObjectWithType<string>,
  typeExpectation: TypeString|Set<string>
) {
  const objectType = object.type
  for (const t of Array.isArray(objectType) ? objectType : [objectType]) {
    if (typeExpectation instanceof Set && typeExpectation.has(t)) {
      return true
    } else if (typeof t === 'string' && t === objectType) {
      return true
    }
  }
  return false;
}
