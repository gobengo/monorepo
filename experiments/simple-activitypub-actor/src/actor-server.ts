import { RequestListener } from "node:http";
import express from "express";
import { debuglog } from "node:util"
import { IActor } from "./actor";
const debug = debuglog(import.meta.url)

export class ActorServer {
  constructor(
    protected getActor: (options: {
      id: URL,
      inbox: URL,
      outbox: URL,
    }) => IActor<string>
  ) {}
  get listener(): RequestListener {
    return express()
      .get('/', (req, res) => {
        const url = createRequestUrl(req)
        res.status(200)
        res.json(this.getActor({
          id: url,
          inbox: new URL('inbox', url),
          outbox: new URL('outbox', url),
        }))
        res.end()
      })
  }
}

function createRequestUrl(req: express.Request): URL {
  const url = new URL(req.originalUrl, `http://${req.headers.host}`)
  return url
}
