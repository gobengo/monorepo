import test from "node:test"
import assert from "node:assert"

import { withHttpServer } from "./http.js";
import { debuglog } from "node:util"
import { ActorServer } from "./actor-server.js";
import { createPersonActor } from "./mastodon.js";
const debug = debuglog(import.meta.url)

test('serves on http', async t => {
  const server = new ActorServer(createPersonActor)
  await withHttpServer(server.listener, async (baseUrl) => {
    const response = await fetch(baseUrl.toString())
    assert.strictEqual(response.status, 200)
    const responseObj = await response.json() as unknown
    debug('responseObj', responseObj)
  })
})
