import type express from 'express';
import * as ap from './activitypub.js';

/**
 * Express.js middleware to redirece GET requests preferring activitypub requests to another URL
 * @param redirectTo - relative url to redirect to
 */
function redirectActivityPubGet(redirectTo: string): express.Handler {
	return function (req, res, next) {
		const acceptsActivityStreams = req.accepts(ap.mediaType);
		if (acceptsActivityStreams) {
			res.redirect(302, redirectTo);
			return;
		}

		next();
	};
}
