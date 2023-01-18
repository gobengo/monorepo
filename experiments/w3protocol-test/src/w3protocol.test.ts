import { test, run } from 'node:test';
import assert from 'node:assert';
import * as upload from '@web3-storage/upload-client'
import * as ed25519 from '@ucanto/principal/ed25519';
import { BlobLike } from '@web3-storage/upload-client/types';
import * as stream from 'node:stream/web'
import Ucanto from '@ucanto/interface';
import * as UCAN from '@ipld/dag-ucan'
import type * as UploadClientTypes from '@web3-storage/upload-client/types'
import * as HTTP from '@ucanto/transport/http'
import * as CAR from '@ucanto/transport/car'
import * as CBOR from '@ucanto/transport/cbor'
import * as ucanto from '@ucanto/core'
import * as Client from '@ucanto/client'

test('can list items in a space', async t => {
  const space = await ed25519.generate();
  const alice = await ed25519.generate();
  const aliceCanManageSpace = await ucanto.delegate({
    issuer: space,
    audience: alice,
    capabilities: [
      {
        can: 'store/list',
        with: space.did(),
      }
    ],
    expiration: Infinity,
  })
  const cases = [
    // production invoke via production upload api
    {
      connection: createHttpConnection<any>(
        `did:web:web3.storage`,
        new URL('https://up.web3.storage'),
      ),
    },
    // production invoke via production access api
    {
      connection: createHttpConnection<any>(
        `did:web:web3.storage`,
        new URL('https://access.web3.storage'),
      ),
    },
    // staging invoke via staging upload api
    {
      connection: createHttpConnection<any>(
        `did:web:staging.web3.storage`,
        new URL('https://staging.up.web3.storage'),
      ),
    },
    // staging invoke via dev access api
    {
      connection: createHttpConnection<any>(
        `did:web:staging.web3.storage`,
        new URL('https://w3access-dev.protocol-labs.workers.dev'),
      ),
    },
    // staging invoke via staging access-api
    // {
    //   connection: createHttpConnection<any>(
    //     `did:web:staging.web3.storage`,
    //     new URL('https://w3access-staging.protocol-labs.workers.dev'),
    //   ),
    // },
    // staging invoke via local
    // {
    //   connection: createHttpConnection<any>(
    //     `did:web:staging.web3.storage`,
    //     new URL('http://localhost:8787'),
    //   ),
    // },
    // production invoke via upload api
    // {
    //   connection: createHttpConnection<any>(
    //     `did:web:web3.storage`,
    //     new URL('https://up.web3.storage'),
    //   ),
    // },
    // production invoke via local
    // {
    //   connection: createHttpConnection<any>(
    //     `did:web:web3.storage`,
    //     new URL('https://localhost:8787'),
    //   ),
    // },
    // production invoke via access-api
    // {
    //   connection: createHttpConnection<any>(
    //     `did:web:web3.storage`,
    //     new URL('https://access.web3.storage'),
    //   ),
    // },
  ]
  for (const testCase of cases) {
    const listResult = await Client.invoke({
      issuer: alice,
      audience: testCase.connection.id,
      capability: {
        can: 'store/list',
        with: space.did(),
        nb: {},
      },
      proofs: [aliceCanManageSpace],
    }).execute(testCase.connection);
    console.log('listResult', listResult)
    try {
      assert.deepEqual('error' in listResult, false, 'store/list result should not be an error')
      assert.notDeepEqual((listResult as any).name, 'HandlerExecutionError', `store/list result should not be a HandlerExecutionError`)
      // assert expected store/list success
      assert.deepEqual(listResult, {
        size: 0,
        results: [],
      }, 'store/list invocation result is expected success type (for empty space)')
    } catch (error) {
      console.warn('unexpected result from store/list invocation', listResult);
      throw error;
    }
  }
})

// skipped for now while we know it doesn't work
test('w3protocol-test can upload file', { skip: true }, async (t) => {
  const space = await ed25519.generate();
  const alice = await ed25519.generate();
  console.log({
    alice: alice.did(),
    space: space.did(),
  })
  const aliceCanManageSpace = await ucanto.delegate({
    issuer: space,
    audience: alice,
    capabilities: [
      {
        can: 'store/*',
        with: space.did(),
      }
    ],
    expiration: Infinity,
  })
  const file: BlobLike = new Blob(['hello world'], { type: 'text/plain' });
  let uploadResult;
  try {
    uploadResult = await upload.uploadFile(
      {
        issuer: alice,
        with: space.did(),
        proofs: [
          aliceCanManageSpace,
        ],
      },
      file,
      {
        connection: createHttpConnection(
          `did:web:web3.storage`,
          new URL('https://access.web3.storage'),
        )
      }
    );
  } catch (error) {
    console.warn('error uploading file')
    if (error && typeof error === 'object' && 'cause' in error) {
      console.warn('error cause', error.cause);
    }
    throw error;
  }
  console.log('uploaded', uploadResult)
  assert.ok(uploadResult, 'upload returned a truthy object')
})

function createHttpConnection<S extends Record<string,any>>(audience: Ucanto.UCAN.DID, url: URL) {
  return Client.connect({
    id: {
      did: () => audience
    },
    encoder: CAR,
    decoder: CBOR,
    channel: HTTP.open<S>({
      url,
      fetch: globalThis.fetch,
    })
  })
}
