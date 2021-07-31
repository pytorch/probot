import * as probot from 'probot';

export default function runCIFlowBot(app: probot.Application): void {
  new CIFlowBot(app).main();
}

export class CIFlowBot {
  // Constructor required
  readonly app: probot.Application;

  // Configurations
  readonly allowed_command: string[] = ['ciflow'];
  readonly bot_app_name = 'pytorchbot';
  readonly bot_assignee = 'pytorchbot';
  readonly pr_label_prefix = 'ciflow/';
  readonly rollout_users = ['zhouzhuojie']; // slow rollout to specific group of users first

  // Stateful instance variables
  command = '';
  command_args: string[] = [];
  comment_author = '';
  comment_body = '';
  ctx: probot.Context = null;
  dispatch_labels: string[] = [];
  dispatch_strategies: string[] = ['add_default_labels'];
  event = '';
  owner = '';
  pr_author = '';
  pr_labels: string[] = [];
  pr_number = 0;
  repo = '';

  constructor(app: probot.Application) {
    this.app = app;
  }

  valid(): boolean {
    if (this.event !== 'pull_request' && this.event !== 'issue_comment') {
      this.ctx.log.error({ctx: this.ctx}, 'Unknown webhook event');
      return false;
    }

    if (this.event === 'issue_comment') {
      if (this.comment_author === '') {
        this.ctx.log.error({ctx: this.ctx}, 'Empty comment author');
        return false;
      }

      // only the pr author can trigger new changes to the ciflow
      if (this.comment_author !== this.pr_author) {
        return false;
      }

      if (!this.allowed_command.includes(this.command)) {
        return false;
      }
    }
    return true;
  }

  rollout(): boolean {
    if (this.rollout_users.includes(this.pr_author)) {
      return true;
    }
    return false;
  }

  async dispatch(): Promise<void> {
    // Default dispatch algorithm: 'add_default_labels'
    // Just make sure the we add a 'ciflow/default' to the existing set of pr_labels
    if (this.dispatch_strategies.includes('add_default_labels')) {
      this.dispatch_labels = ['ciflow/default', ...this.pr_labels];
    }

    // TODO add other dispatch algorithms based on the ctx or user instructions

    // Signal the diapatch
    await this.signal();

    // Logging of the dispatch
    this.ctx.log.info(
      {
        dispatch_labels: this.dispatch_labels,
        dispatch_strategies: this.dispatch_strategies,
        event: this.event,
        owner: this.owner,
        pr_number: this.pr_number,
        pr_labels: this.pr_labels,
        repo: this.repo
      },
      'ciflow dispatch success!'
    );
  }

  async signal(): Promise<void> {
    await this.setLabels();

    await this.ctx.github.issues.addAssignees({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pr_number,
      assignees: [this.bot_assignee]
    });

    await this.ctx.github.issues.removeAssignees({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pr_number,
      assignees: [this.bot_assignee]
    });
  }

  async setLabels(): Promise<void> {
    const labels = this.dispatch_labels.filter(label =>
      label.startsWith(this.pr_label_prefix)
    );
    const labelsToDelete = this.pr_labels.filter(l => !labels.includes(l));
    const labelsToAdd = labels.filter(l => !this.pr_labels.includes(l));
    for (const label of labelsToDelete) {
      await this.ctx.github.issues.removeLabel({
        owner: this.ctx.payload.repository.owner.login,
        repo: this.ctx.payload.repository.name,
        issue_number: this.pr_number,
        name: label
      });
    }
    await this.ctx.github.issues.addLabels({
      owner: this.ctx.payload.repository.owner.login,
      repo: this.ctx.payload.repository.name,
      issue_number: this.pr_number,
      labels: labelsToAdd
    });
    this.dispatch_labels = labels;
  }

  parseComment(): void {
    const re = new RegExp(`^.*@${this.bot_app_name}\\s+(\\w+)\\s?(.*)$`);
    const found = this.comment_body?.match(re);
    if (!found) {
      return;
    }

    if (found.length >= 2) {
      this.command = found[1];
    }
    if (found.length === 3) {
      this.command_args = found[2].split(' ');
    }
  }

  parseContext(ctx: probot.Context): void {
    this.ctx = ctx;
    this.event = ctx.name;
    const pr = ctx.payload?.pull_request || ctx.payload?.issue;
    this.pr_number = pr?.number;
    this.pr_author = pr?.user?.login;
    this.pr_labels = pr?.labels
      ?.filter(label => label.name.startsWith(this.pr_label_prefix))
      ?.map(label => label.name);
    this.comment_author = ctx.payload?.comment?.user?.login;
    this.comment_body = ctx.payload?.comment?.body;
    this.owner = ctx.payload?.repository?.owner?.login;
    this.repo = ctx.payload?.repository?.name;
    this.parseComment();
    return;
  }

  async handler(ctx: probot.Context): Promise<void> {
    this.parseContext(ctx);
    this.ctx.log.info(
      {
        dispatch_labels: this.dispatch_labels,
        dispatch_strategies: this.dispatch_strategies,
        event: this.event,
        owner: this.owner,
        pr_labels: this.pr_labels,
        pr_number: this.pr_number,
        repo: this.repo
      },
      'ciflow dispatch started!'
    );
    if (!this.valid()) {
      return;
    }
    if (!this.rollout()) {
      return;
    }
    await this.dispatch();
    return;
  }

  main(): void {
    this.app.on('pull_request.opened', this.handler.bind(this));
    this.app.on('pull_request.reopened', this.handler.bind(this));
    this.app.on('pull_request.synchronize', this.handler.bind(this));
    this.app.on('issue_comment.created', this.handler.bind(this));
    this.app.on('issue_comment.edited', this.handler.bind(this));
  }
}
