# pytorch-probot

> A GitHub App built with [Probot](https://github.com/probot/probot) that Bot actions for PyTorch

Add an issue to your project like https://github.com/pytorch/pytorch/issues/24422
and add a `.github/pytorch-probot.yml` file with:

```yml
tracking_issue: 24422
```

Based on who is listed in the tracking issue, the bot will automatically
CC people when labels are added to an issue.

## Setup

```sh
# Install dependencies
yarn install

# Run the tests
yarn test

# Run the bot
yarn start
```

If you want to smoketest the bot on a test repository, you'll need to
create a GitHub app.  Go to the webpage from probot; it will walk
through the process.

## Deploying

```sh
zip -FSr ../pytorch-probot.zip . -x '*.git*' '*.env*'
s3cmd put ../pytorch-probot.zip s3://ossci-assets/pytorch-probot.zip
```

Then "Upload a file from Amazon S3" from the web UI at https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/pytorch-probot?tab=graph (using the above s3 url)

## Contributing

If you have suggestions for how pytorchbot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2019 Edward Z. Yang <ezyang@fb.com> (https://pytorch.org)
