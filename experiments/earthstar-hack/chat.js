import * as Earthstar from "https://cdn.earthstar-project.org/js/earthstar.web.v10.0.2.js";

const settings = new Earthstar.SharedSettings();
settings.foo = "bar"
// console.log('settings', settings)

const shareKeypair = {
  shareAddress: "+chatting.bn6kn6majgivcofrtqimannwsgroecsclg4eq6xj2ygxn7b7msl5q",
  secret: "bchzzotbjbz56k3dkqmupu23auzb46phkibxumlx6x3c7jckzoo2q",
}

const authorKeypair = {
  address: "@test.bmv2rktifxocfclqabogppsvha37tuvhcyd5quv5gj5kojd6hjaja",
  secret: "bzxi7gk55lul2pw62br73dxftbnrcgzcct73maxpckbitbtkw53ca",
}

if (Earthstar.notErr(shareKeypair) && Earthstar.notErr(authorKeypair)) {
	// console.group("Share keypair");
	// console.log(shareKeypair);
	// console.groupEnd();

	// console.group("Author keypair");
	// console.log(authorKeypair);
	// console.groupEnd();
} else if (Earthstar.isErr(shareKeypair)) {
	console.error(shareKeypair);
} else if (Earthstar.isErr(authorKeypair)) {
	console.error(authorKeypair);
}

const replica = new Earthstar.Replica({
	driver: new Earthstar.ReplicaDriverWeb(shareKeypair.shareAddress),
	shareSecret: shareKeypair.secret,
});

const form = document.getElementById("message-form");
const input = document.querySelector("input");

form.addEventListener("submit", async (event) => {
	// This stops the page from reloading.
	event.preventDefault();

	// Write the contents of the message to the replica.
	const result = await replica.set(authorKeypair, {
		text: input.value,
		path: `/chat/~${authorKeypair.address}/${Date.now()}`,
	});
	
	if (Earthstar.isErr(result)) {
		console.error(result);
	}

	input.value = "";
});

// Read messages from chat.
const messages = document.getElementById("messages");

const cache = new Earthstar.ReplicaCache(replica);

function renderMessages() {
	messages.innerHTML = "";

	const chatDocs = cache.queryDocs({
		filter: { pathStartsWith: "/chat" },
	});

	for (const doc of chatDocs) {
    const author = Earthstar.parseAuthorAddress(doc.author)
    // console.log({
    //   doc,
    //   author: Earthstar.parseAuthorAddress(doc.author),
    // })
		const message = document.createElement("li");

		message.textContent = `${author.name}: ${doc.text}`

		messages.append(message);
	}
}

cache.onCacheUpdated(() => {
	renderMessages();
});

renderMessages();

const peer = new Earthstar.Peer();
peer.addReplica(replica);
peer.sync("http://localhost:8000", true);
