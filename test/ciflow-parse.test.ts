import {parseCIFlowIssue} from '../src/ciflow-bot';

describe('Parse CIFflow issue', () => {
  test('Empty', () => {
    expect(parseCIFlowIssue('')).toStrictEqual(new Map());
  });

  test('One line', () => {
    expect(parseCIFlowIssue('@malfet')).toStrictEqual(
      new Map([
        [
          'malfet',
          {
            githubHandler: 'malfet',
            optOut: false,
            defaultLabels: ['ciflow/default']
          }
        ]
      ])
    );
  });

  test('Empty lines', () => {
    expect(
      parseCIFlowIssue(`

                            @malfet

                            `)
    ).toStrictEqual(
      new Map([
        [
          'malfet',
          {
            githubHandler: 'malfet',
            optOut: false,
            defaultLabels: ['ciflow/default']
          }
        ]
      ])
    );
  });

  test('Two users', () => {
    expect(
      parseCIFlowIssue(`
                            @malfet
                            @octocat cats
                            -@opt-out-user
                            `)
    ).toStrictEqual(
      new Map([
        [
          'malfet',
          {
            githubHandler: 'malfet',
            optOut: false,
            defaultLabels: ['ciflow/default']
          }
        ],
        [
          'octocat',
          {
            githubHandler: 'octocat',
            optOut: false,
            defaultLabels: ['cats']
          }
        ],
        [
          'opt-out-user',
          {
            githubHandler: 'opt-out-user',
            optOut: true,
          }
        ]
      ])
    );
  });
});
