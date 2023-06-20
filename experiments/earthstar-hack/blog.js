import * as Earthstar from "https://cdn.earthstar-project.org/js/earthstar.web.v10.0.2.js";

const settings = new Earthstar.SharedSettings();
console.log('settings', settings)
console.log('settings.author', settings.author)
console.log('settings.shares', settings.shares)

if (settings.shares.length === 0) {
  settings.addShare(
    await Earthstar.Crypto.generateShareKeypair('blog')
  )
}

const localBlogReplica = new Earthstar.Replica({
  driver: new Earthstar.ReplicaDriverWeb(localBlogShare.shareAddress),
  shareSecret: localBlogShare.secret
})

console.log('localBlogShare', localBlogShare)

console.log({
  localBlogShare,
  localBlogReplica,
})

const cache = new Earthstar.ReplicaCache(localBlogReplica);
cache.onCacheUpdated(() => {
  renderBlog();
})

function renderBlogFragment() {
  const blogDocs = cache.queryDocs({
    filter: {
      pathStartsWith: '/blog/',
    }
  })
  console.log({ blogDocs })
  const fragment = document.createDocumentFragment();
  const postsList = document.createElement('div');
  postsList.innerHTML = `
    <ul>
    ${
      blogDocs.map(post => {
        return `
        <li>
        ${post.text}
        </li>
        `
      }).join('\n')
    }
    </ul>
  `
  fragment.appendChild(postsList)
  return fragment
}

function renderBlog(el=document.getElementById('blog')) {
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(renderBlogFragment())
}

// renderBlog()

const form = document.getElementById("message-form");
const input = document.querySelector("input");

form.addEventListener("submit", async (event) => {
	// This stops the page from reloading.
	event.preventDefault();

	// Write the contents of the message to the replica.
  const blogDoc = {
		text: input.value,
		path: `/blog/~${settings.author.address}/${Date.now()}`,
	}
  console.log('setting blogDoc', blogDoc)
	const result = await localBlogReplica.set(settings.author, blogDoc);
	
	if (Earthstar.isErr(result)) {
		console.error(result);
	}

	input.value = "";
  renderBlog();
});

const syncPeer = new Earthstar.Peer();
syncPeer.addReplica(localBlogReplica);
syncPeer.sync("http://localhost:8000", true)
