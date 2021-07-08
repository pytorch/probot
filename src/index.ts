import {install} from 'source-map-support';

import autoCcBot from './auto-cc-bot';
import autoLabelBot from './auto-label-bot';
import triggerCircleCiBot from './trigger-circleci-workflows';
import {Application} from 'probot';

// Needed for traceback translation from transpiled javascript -> typescript
install();

function runBot(app: Application): void {
  autoCcBot(app);
  autoLabelBot(app);
  triggerCircleCiBot(app);
}

export = runBot;
