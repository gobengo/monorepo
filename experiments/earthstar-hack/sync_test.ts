import * as Earthstar from "https://deno.land/x/earthstar@v10.0.2/mod.ts";

const SHARE_TO_SYNC =
	"+gardening.bhyux4opeug2ieqcy36exrf4qymc56adwll4zeazm42oamxtr7heq";

const SHARE_SECRET = "buaqth6jr5wkksnhdlpfi64cqcnjzfx3r6cssnfqdvitjmfygsk3q";

const authorKeypair = await Earthstar.Crypto.generateAuthorKeypair("suzy");

if (Earthstar.isErr(authorKeypair)) {
	console.error(authorKeypair);
	Deno.exit(1);
}

const replica = new Earthstar.Replica({
	driver: new Earthstar.ReplicaDriverMemory(SHARE_TO_SYNC),
	shareSecret: SHARE_SECRET,
});

await replica.set(authorKeypair, {
	path: "/test",
	text: "Hello.",
});

const peer = new Earthstar.Peer();

peer.addReplica(replica);

const syncer = peer.sync("http://localhost:8000");

await syncer.isDone();

console.log("Successfully synced with server.");
