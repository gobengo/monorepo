import { Actor } from "./actor.js";

export interface IActorRepository {
  getById(id: URL): Promise<null|Actor>
}

export class SingleActorRepository implements IActorRepository {
  constructor(public actorId: URL, private actor: Actor) {}
  async getById(id: URL) {
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
      byPathSegment:
      | Pick<Map<string,Actor>, 'get'>
      | { get(pathSegment: string): Promise<Actor|undefined> },
    }
  ) {
    this.actorsUrl = options.actorsUrl
    if ( ! options.actorsUrl.toString().endsWith('/')) {
      throw new Error('actorsUrl must end with /')
    }
  }
  async getByPathSegment(pathSegment: string): Promise<null|Actor> {
    const actor = await this.options.byPathSegment.get(pathSegment)
    return actor ?? null;
  }
  async getById(url: URL) {
    const actorsUrlString = this.options.actorsUrl.toString();
    if ( ! url.toString().startsWith(actorsUrlString)) {
      return null;
    }
    const actorSuffix = url.toString().slice(actorsUrlString.length)
    const actorPathSegment = actorSuffix.split('/')[0]
    return this.getByPathSegment(actorPathSegment)
  }
}
