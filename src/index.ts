import autoCcBot from './auto-cc-bot';
import autoLabelBot from './auto-label-bot';
import {myBot as customCiInfoBot} from './custom-ci-info-bot';
import triggerCircleCiBot from './trigger-circleci-workflows';
import {Application} from 'probot';

function runBot(app: Application): void {
  autoCcBot(app);
  autoLabelBot(app);
  customCiInfoBot(app);
  triggerCircleCiBot(app);
}

export = runBot;
