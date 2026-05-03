const Sentry = require('../../instrument.js');

process.on('unhandledRejection', (reason) => {
	Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
	Sentry.captureException(error);
	Sentry.flush(2000)
		.catch(() => {})
		.finally(() => process.exit(1));
});

module.exports = Sentry;
