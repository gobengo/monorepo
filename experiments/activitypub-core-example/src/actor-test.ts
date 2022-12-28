import type { Assert } from './assert.js';
import { hasOwnProperty } from "./object.js";
import * as as2 from "./activitystreams2.js";

export function assertValidActor(actor: unknown, assert: Assert) {
  assert(typeof actor === 'object', 'actor is an object');
  assert(actor !== null, 'actor is not null');
  assertHasValidLdContext(actor, assert);
}

/**
 * assert valid actor @context value
 * It must either be the right string value,
 * or an array containing that string value
 */
function assertHasValidLdContext(actor: object, assert: Assert) {
  assert.ok(hasOwnProperty(actor, '@context'), 'actor has @context');
  const context = actor['@context'];
  if (typeof context === 'string') {
    assert.equal(context, as2.contextUrl.toString(), 'actor @context is correct string');
  } else if (Array.isArray(context)) {
    assert.ok(context.includes(as2.contextUrl.toString()), 'actor @context array includes as2 context url');
  } else {
    throw new Error(`Expected actor @context to be a string or array, got ${typeof context}`)
  }
}
