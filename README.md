# pytorch-probot

> A GitHub App built with [Probot](https://github.com/probot/probot) that Bot actions for PyTorch

## Setup

```sh
# Install dependencies
yarn install

# Run the bot
yarn start
```

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
