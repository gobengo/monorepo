import test from "ava";
import { CannotTraverseError, UrlPathTraverser } from "./url.js";

test('PathWalker can go back and forth actor to outbox', async t => {
  const cases = [
    {
      walker: UrlPathTraverser.create('.activitypub/outbox/'),
      edges: [
        {
          source: new URL('http://localhost/actor/'),
          target: new URL('http://localhost/actor/.activitypub/outbox/'),
        }
      ]
    },
    {
      walker: UrlPathTraverser.create('/outbox/'),
      edges: [
        {
          source: new URL('http://localhost/actor'),
          target: new URL('http://localhost/actor/outbox/'),   
        },
        {
          target: new URL('http://localhost/incorrect-suffix/'),
          throws: { instanceOf: CannotTraverseError }
        }
      ]
    },
  ]
  for (const { walker, edges } of cases) {
    for (const { source, target, throws } of edges) {
      if (source && target) {
        t.deepEqual(walker.follow(source).toString(), target.toString(), `${walker} can follow relation source -> target`);
        t.deepEqual(walker.invert(target).toString(), source.toString(), `${walker} can invert relation target -> source`);    
      }
      if (target && throws) {
        t.throws(() => walker.invert(target), throws, `${walker} throws when trying to invert relation target -> source`)
      }
    }
  }
})
