import { tryGetContext } from 'hono/context-storage';
import pino from 'pino';

import type { AppEnv } from '../env.js';
import { APP_VERSION } from '../utils/version.js';

export const logger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	base: { 'service.name': 'rootprint-api', 'service.version': APP_VERSION },
	timestamp: pino.stdTimeFunctions.isoTime,
	formatters: { level: (label) => ({ level: label }) },
	// Any line written while a request is in flight carries its id, without threading a logger
	// through services.
	mixin: () => {
		const c = tryGetContext<AppEnv>();
		return c ? { 'http.request.id': c.get('requestId') } : {};
	},
	serializers: {
		err: pino.stdSerializers.err
	}
});
