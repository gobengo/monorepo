import test from "ava";
import { UrlPathTraverser } from "./url.js";

test('PathWalker can go back and forth actor to outbox', async t => {
  const cases = [
    {
      walker: UrlPathTraverser.create('.activitypub/outbox/'),
      source: new URL('http://localhost/actor/'),
      target: new URL('http://localhost/actor/.activitypub/outbox/')
    },
    {
      walker: UrlPathTraverser.create('/outbox/'),
      source: new URL('http://localhost/actor'),
      target: new URL('http://localhost/actor/outbox/')
    }
  ]
  for (const { walker, source, target } of cases) {
    t.deepEqual(walker.follow(source).toString(), target.toString(), `${walker} can follow relation source -> target`);
    t.deepEqual(walker.invert(target).toString(), source.toString(), `${walker} can invert relation target -> source`);
  }
})
