import test from "ava";
import { ActorServer } from "./actor-server.js";
import { withHttpServer } from "./http.js";

test('responds to GET / with 200', t => withHttpServer(ActorServer.create(), async (baseUrl) => {
  const response = await fetch(baseUrl.toString());
  t.is(response.status, 200);
}));
