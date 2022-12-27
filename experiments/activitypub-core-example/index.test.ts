import test from "ava";
import { addressHttpURL } from "./index.js";

test('addressHttpURL', async (t) => {
  t.is(addressHttpURL({
    address: '::',
    port: 3000,
  }).toString(), 'http://localhost:3000/')
})

type UUID = string
type Actor = { uuid: UUID }

interface IActorRepository {
  getById(id: URL): Promise<null|Actor>
}

class SingleActorRepository implements IActorRepository {
  constructor(private id: URL, private actor: Actor) {}
  async getById(id: URL) {
    if (this.id !== id) {
      return null;
    }
    return this.actor
  }
}

function createMockActor(): Actor {
  return {
    uuid: `uuid-${Math.random().toString().slice(2)}`,
  }
}

test('SingleActorRepository can get by id', async (t) => {
  const actorUrl = new URL('http://localhost/actor')
  const actor1 = createMockActor()
  const actors = new SingleActorRepository(actorUrl, actor1)
  const found = await actors.getById(actorUrl)
  t.is(found?.uuid, actor1.uuid, 'found actor by id')
})

// class ActivityPubEntityFinder {
//   constructor(private actors: ActorRepository) {}
//   getById() {

//   }
// }

// test('ActivityPubEntityFinder can find actor by id', async (t) => {
//   const localBaseUrl = new URL('http://localhost')
//   const locality = new Locality(localBaseUrl)
//   const actors = new ActorRepository({
//     locality
//   })
//   const finder = new ActivityPubEntityFinder(actors)
//   const found = finder.getById('http://localhost');
//   t.assert(found, 'found actor by id')
// })
