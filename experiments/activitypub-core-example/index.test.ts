import test from "ava";
import { addressHttpURL } from "./index.js";

test('addressHttpURL', async (t) => {
  t.is(addressHttpURL({
    address: '::',
    port: 3000,
  }).toString(), 'http://localhost:3000/')
})
