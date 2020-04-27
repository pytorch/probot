import autoCcBot from './auto-cc-bot';
import autoLabelBot from './auto-label-bot';
import triggerCircleCiBot from './trigger-circleci-workflows';
import {Application} from 'probot';

function runBot(app: Application): void {
  autoCcBot(app);
  autoLabelBot(app);
  triggerCircleCiBot(app);
}

export default runBot;
