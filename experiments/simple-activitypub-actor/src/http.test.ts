import test from "node:test";
import assert from "node:assert";
import { addressUrl } from "./http.js";

test('addressUrl', async (t) => {
  assert.equal(
    addressUrl({
      address: '::',
      port: 3000,
    }).toString(),
    'http://localhost:3000/',
  )
})
