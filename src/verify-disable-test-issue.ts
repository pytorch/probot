import * as probot from 'probot';

const validationCommentStart = '<!-- validation-comment-start -->';
const validationCommentEnd = '<!-- validation-comment-end -->';
const disabled_key = 'DISABLED'
const supported_platforms = new Set(['mac', 'macos', 'win', 'windows', 'linux', 'rocm'])

async function getValidationComment(context: any, issue_number: string, owner: string, repo: string) {
  const commentsRes = await context.github.issues.listComments({
    owner: owner,
    repo: repo,
    issue_number: issue_number,
    per_page: 10
  });
  for (const comment of commentsRes.data) {
    if (comment.body.includes(validationCommentStart)) {
      return [comment.id, comment.body];
    }
  }
  return [0, ''];
}

function parseTitle(title: string) {
  const test_name = title.slice(disabled_key.length)
  const split = test_name.split(/\s+/)
  const test_case = split[0]
  let test_suite = ''
  if (split.length > 1 && split[1].startsWith('(__main__.') && split[1].endsWith(')')) {
    test_suite = split[1].slice('(__main__.'.length, split[1].length - 1)
  }
  return [test_case, test_suite]
}

function parseBody(body: string) {
  const lines = body.split(/[\r\n]+/)
  let platforms_to_skip = new Set();
  let invalid_platforms = new Set();
  const key = 'platforms:'
  for (let line of lines) {
    line = line.toLowerCase()
    if (line.startsWith(key)) {
      for (let platform of line.slice(key.length).split(/^\s+|\s*,\s*|\s+$/)) {
        if (supported_platforms.has(platform)) {
          platforms_to_skip.add(platform)
        } else {
          invalid_platforms.add(platform)
        }
      }
    }
  }
  return [platforms_to_skip, invalid_platforms]
}

function formValidationComment(test_info, platforms) {
  const test_case_name = test_info[0]
  const test_suite_name = test_info[1]
  const platforms_to_skip = Array.from(platforms[0]).sort()
  const platform_msg =
    platforms_to_skip.length === 0 ? 'none parsed, defaulting to ALL platforms' : platforms_to_skip.join(', ')
  const invalid_platforms = Array.from(platforms[1]).sort()

  let body = '<details>Hello there! From the DISABLED prefix in this issue title, '
  body += 'it looks like you are attempting to disable a test in PyTorch CI. '
  body += 'The information I have parsed is below:\n'
  body += '<b>Test case name<b>: ' + test_case_name + '\n'
  body += '<b>Test suite name<b>: ' + test_suite_name + '\n'
  body += '<b>Platforms for which to skip the test<b>: ' + platform_msg + '\n\n'

  if (!test_case_name || !test_suite_name) {
    body += '<b>ERROR!<b> As you can see above, I could not properly parse the test '
    body += 'information and determine which test to disable. Please modify the '
    body += 'title to be of the format: DISABLED test_case_name (__main__.TestSuiteName).\n'
  }

  if (invalid_platforms.length > 0) {
    body += '<b>WARNING!<b> In the parsing process, I received these invalid inputs as platforms for '
    body += 'which the test will be disabled: ' + invalid_platforms.join(', ') + '. These could '
    body += 'be typos or platforms we do not yet support test disabling. Please '
    body += 'verify the platform list above and modify your issue body if needed.\n'
  }

  if (test_case_name && test_suite_name) {
    body += 'Within ~15 minutes, test case ' + test_case_name + ' from test suite'
    body += test_suite_name + 'will be disabled in PyTorch CI for '
    body += (platforms_to_skip.length === 0 ? 'all platforms' : 'these platforms: ' + platforms_to_skip.join(', '))
    body += '.\n'
  }

  body += 'To modify the platforms list, please include a line in the issue body:\n\n'
  body += 'Platforms: case-insensitive, list, of, platforms\n\nWe currently support the following platforms: '
  body += Array.from(supported_platforms).sort().join(', ') + '.</details>'

  return validationCommentStart + body + validationCommentEnd
}

function myBot(app: probot.Application): void {
  app.on(['issues.opened', 'issues.edited'], async context => {
    const state = context.payload['issue']['state']
    const title = context.payload['issue']['title']
    const owner = context.github.owner
    const repo = context.github.repo

    if (state === 'closed' || !title.startsWith(disabled_key)) {
      return
    }

    const body = context.payload['issue']['body']
    const number = context.payload['issue']['number']
    const existingValidationCommentData = await getValidationComment(context, number, owner, repo)
    const existingValidationCommentID = existingValidationCommentData[0]
    const existingValidationComment = existingValidationCommentData[1]

    const test_info = parseTitle(title)
    const platforms = parseBody(body)
    const validationComment = formValidationComment(test_info, platforms)

    if (existingValidationComment === validationComment) {
      return
    }

    if (existingValidationCommentID === 0) {
      const res = await this.ctx.github.issues.createComment({
        validationComment,
        owner: owner,
        repo: repo,
        issue_number: number
      });
      const newCommentID = res.data.id;
    } else {
      await this.ctx.github.issues.updateComment({
        validationComment,
        owner: owner,
        repo: repo,
        comment_id: existingValidationCommentID
      });
    }
  });
}

export default myBot;
