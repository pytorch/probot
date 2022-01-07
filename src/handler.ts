import {
  createLambdaFunction,
  createProbot
} from '@probot/adapter-aws-lambda-serverless';
import {install} from 'source-map-support';
import appFn from './';

// Needed for traceback translation from transpiled javascript -> typescript
install();

module.exports.webhooks = createLambdaFunction(appFn, {
  probot: createProbot()
});
