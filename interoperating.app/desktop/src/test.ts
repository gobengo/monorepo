import test from 'ava';

test('Can run app and then abort the run', async t => {
	const abortController = new AbortController
	await Promise.all([
		run({ abort: abortController }),
		timeout(1).then(() => abortController.abort())
	])
	t.assert(abortController.signal.aborted)
})

function run({ abort }: {
	abort: {
		signal: AbortSignal
	}
}) {
	return new Promise((resolve, reject) => {
		abort.signal.addEventListener('abort', resolve)
	})
}

function timeout(milliseconds: number) {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, milliseconds)
	})
}
