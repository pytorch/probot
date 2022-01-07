import {serverless} from '@probot/serverless-lambda';
import {install} from 'source-map-support';
import appFn from './';

// Needed for traceback translation from transpiled javascript -> typescript
install();

module.exports.probot = serverless(appFn);
