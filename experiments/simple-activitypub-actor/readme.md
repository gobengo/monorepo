# simple-activitypub-actor

An experiment in trying to make a web server acting as an ActivityPub Actor that also interoperates with mastodon (which requires more than ActivityPub).

Why?
* then I have sample code to make other mashups and experiments that present as bots on mastodon and the broader fediverse

How does it interoperate with Mastodon?
* [x] if you search in mastodon for the URL of this actor, it will show up as a result with a name and icon
  * pro tip: when devving and running this server on localhost, you can expose that port to the world with ssl via [ngrok](https://ngrok.com/). `ngrok http 3000` to expose port 3000. Then you can use the ngrok base URL when searching in a mastodon instance.
* [ ] you can see recent posts from the actor's outbox
  * [ ] for this, mastodon requires someone on the instance to be following the actor (or retoot i hear), so we need to implement followability
    * [ ] followability requires implementing an activitypub inbox
    * [ ] and the inbox has to be able to receive 'Follow' activities
    * [ ] and whenever it receives a 'Follow' activity, it needs to reply to the sender with an 'Accept' activity to consent to the follow
      * [ ] I think this might require implementing one of the authentication methods e.g. http signatures

## Usage

`npm start`

### Configuration

Configure via environment variables

* `PORT` - port the web server should listen on
