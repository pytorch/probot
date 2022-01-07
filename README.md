# pytorch-probot

A GitHub App built with [Probot](https://github.com/probot/probot) that implements bot actions for PyTorch

This bot implements a few behaviors.  **This bot currently only
implements idempotent behaviors (i.e., it is harmless if the bot process
events multiple times.**  If you add support for non-idempotent
behaviors, you need to make sure only the GitHub Action or AWS Lambda is
enabled.

## auto-cc-bot

Add an issue to your project like https://github.com/pytorch/pytorch/issues/24422
and add a `.github/pytorch-probot.yml` file with:

```yml
tracking_issue: 24422
```

Based on who is listed in the tracking issue, the bot will automatically
CC people when labels are added to an issue.

## auto-label-bot

* If an issue is labeled **high priority**, also label it
  **triage review**
* If an issue is labeled **topic: flaky-tests**, also label it
  **high priority** and **triage review**
* If an issue or pull request contains a regex in its title, label
  it accordingly, e.g., a title containing 'ROCm' would yield the
  **module: rocm** label.

## trigger-circleci-workflows

* Trigger circleci workflows based off of labeling events / push events

Configuration (`.github/pytorch-circleci-labels.yml`) should look similar to this:
```yml
labels_to_circle_params:
  # Refers to github labels
  ci/binaries:
    # Refers to circleci parameters
    # For circleci documentation on pipeline parameters check:
    #      https://circleci.com/docs/2.0/pipeline-variables/#pipeline-parameters-in-configuration
    parameter: run_binaries_tests
    # [[optional]] Automatically trigger workflows with parameters on push
    default_true_on:
      branches:
        - nightly
        # Regex is allowed as well
        - ci-all/.*
      # Even works on tags!
      tags:
        - v[0-9]+(\.[0-9]+)*-rc[0-9]+
  # Multiple label / parameters can be defined
  ci/bleh:
    parameter: run_bleh_tests
  ci/foo:
    parameter: run_foo_tests
```

## Setup

```sh
# Install dependencies
yarn install

# Run the tests
yarn test

# Run the bot
yarn start
```

## Live testing as a GitHub App

If you want to smoketest the bot on a test repository, you'll need to
create a GitHub app.  Go to the webpage from probot; it will walk
through the process.

## Deploying to AWS

[`.github/workflows/build.yml`](.github/workflows/build.yml) will build and deploy the code on every push to `main`.

## Contributing

If you have suggestions for how pytorchbot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2019 Edward Z. Yang <ezyang@fb.com> (https://pytorch.org)
