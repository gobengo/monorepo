import { Actor } from "./actor.js";

export interface IActorRepository {
  getById(id: URL): null|Actor
}

export class SingleActorRepository implements IActorRepository {
  constructor(public actorId: URL, private actor: Actor) {}
  getById(id: URL) {
    if (this.actorId.toString() !== id.toString()) {
      return null;
    }
    return this.actor
  }
}

export class MultiActorRepository implements IActorRepository {
  public actorsUrl: URL
  constructor(
    private options: {
      actorsUrl: URL,
      byPathSegment: Pick<Map<string,Actor>, 'get'>
    }
  ) {
    this.actorsUrl = options.actorsUrl
    if ( ! options.actorsUrl.toString().endsWith('/')) {
      throw new Error('actorsUrl must end with /')
    }
  }
  getByPathSegment(pathSegment: string): null|Actor {
    const actor = this.options.byPathSegment.get(pathSegment)
    return actor ?? null;
  }
  getById(url: URL) {
    const actorsUrlString = this.options.actorsUrl.toString();
    if ( ! url.toString().startsWith(actorsUrlString)) {
      return null;
    }
    const actorSuffix = url.toString().slice(actorsUrlString.length)
    const actorPathSegment = actorSuffix.split('/')[0]
    if (typeof actorPathSegment !== 'string') {
      throw new Error(`unexpected actorPathSegment ${actorPathSegment}`)
    }
    return this.getByPathSegment(actorPathSegment)
  }
}
