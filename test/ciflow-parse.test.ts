import {parseCIFlowIssue} from '../src/ciflow-bot';

describe('Parse CIFflow issue', () => {
  test('Empty', () => {
    expect(parseCIFlowIssue('')).toStrictEqual({});
  });
  test('One line', () => {
    expect(parseCIFlowIssue('@malfet')).toStrictEqual({'malfet':['ciflow/default']});
  });
  test('Empty lines', () => {
    expect(parseCIFlowIssue(`

                            @malfet

                            `)).toStrictEqual({'malfet':['ciflow/default']});
  });
  test('Two users', () => {
    expect(parseCIFlowIssue(`
                            @malfet
                            @octocat cats
                            `)).toStrictEqual({'malfet':['ciflow/default'], 'octocat': ['cats']});
  });
});
