import { describe, expect, it } from 'vitest';
import { catalogs, resolveLocale, translate } from './i18n';

describe('translate', () => {
  it('returns catalog value when key exists', () => {
    const cat = { 'Foo.Bar': 'hello {name}' };
    expect(translate(cat, 'Foo.Bar', { name: 'world' })).toBe('hello world');
  });
  it('keeps {name} literal when arg missing', () => {
    const cat = { 'Foo.Bar': 'hi {name}' };
    expect(translate(cat, 'Foo.Bar')).toBe('hi {name}');
  });
  it('falls back to key when key missing in both catalogs', () => {
    const cat: Record<string, string> = {};
    expect(translate(cat, 'Missing')).toBe('Missing');
  });
  it('handles multiple substitutions', () => {
    const cat = { X: 'a {x} b {y}' };
    expect(translate(cat, 'X', { x: '1', y: '2' })).toBe('a 1 b 2');
  });
});

describe('resolveLocale', () => {
  it.each([
    ['zh_CN', 'zh_CN'],
    ['zh-CN', 'zh_CN'],
    ['zh_TW', 'zh_TW'], // zh_TW is now a proper catalog (not aliased to en)
    ['', 'en'],
    ['fr', 'en'],
  ] as const)('resolveLocale(%p) → %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe('zh_TW catalog', () => {
  it('is not aliased to the English catalog', () => {
    expect(catalogs.zh_TW).not.toBe(catalogs.en);
  });

  it.each([
    'Auth.SudoTitle',
    'Auth.SudoSubtitle',
    'Auth.UseAuthenticator',
    'Auth.WebAuthnVerified',
    'Auth.Confirm',
    'Auth.TfaCode',
    'Auth.Password',
    'Auth.Username',
    'Auth.Email',
    'Auth.SignIn',
    'Auth.CreateAccount',
    'Auth.AlreadyHaveAccount',
    'Auth.BackToSignIn',
    'Auth.Forgot',
    'Auth.RememberMe',
    'Auth.SubmitLogin',
    'Auth.SigningIn',
    'Auth.WelcomeBack',
    'Auth.AlreadySignedIn',
    'Auth.Create',
    'Auth.NoLoginMethodsTitle',
    'Auth.NoLoginMethodsMessage',
    'Auth.UseAccount',
    'ContestForm.Permission',
    'ContestForm.PermissionPublic',
    'ContestForm.PermissionInvite',
    'ContestForm.PermissionAssign',
    'ContestForm.SectionPermission',
    'ContestForm.InviteCode',
    'ContestForm.Assign',
    'ContestForm.Title',
    'ContestForm.Create',
    'ContestForm.Update',
    'ContestForm.Rule',
    'ContestForm.Saving',
    'ContestForm.Delete',
    'ContestForm.Clone',
    'ContestForm.Maintainer',
    'ContestForm.Pids',
    'ContestForm.Duration',
    'Common.Submit',
    'Common.Cancel',
    'Common.Save',
    'Common.Delete',
    'Common.ConfirmDelete',
    'Common.Edit',
    'Common.Loading',
    'Common.Back',
    'Common.Title',
    'Common.Close',
    'Common.Login',
    'Common.Search',
    'Common.All',
    'Common.Yes',
    'Common.No',
    'Common.Time',
    'Common.OpenPolyhedron',
    'Common.Dismiss',
    'Common.DontShowAgain',
    'Problem.NoPermissionToSubmit',
    'Problem.LoginToSubmit',
    'Problem.Submit',
    'Problem.Status',
    'Problem.Score',
    'Problem.Type',
    'Problem.Memory',
    'Problem.Edit',
    'Problem.Difficulty',
    'Problem.Star',
    'Problem.Statement',
    'Discussion.Create',
    'Discussion.Edit',
    'Discussion.Title',
    'Discussion.Content',
    'RecordDetail.SubmitBy',
    'RecordDetail.Hacked',
    'RecordDetail.Problem',
    'RecordDetail.Language',
    'RecordDetail.CodeLength',
    'ProblemGenerateTestdata.Title',
    'ProblemGenerateTestdata.Generated',
    'ProblemGenerateTestdata.GenerateFailed',
  ])('zh_TW translates %s differently from en', (key) => {
    expect(catalogs.zh_TW[key]).toBeTruthy();
    expect(catalogs.zh_TW[key]).not.toBe(catalogs.en[key]);
  });
});

describe('zh_CN typography', () => {
  it('catalog key Auth.SudoSubtitle uses full-width comma (U+FF0C) in zh_CN', () => {
    expect(catalogs.zh_CN['Auth.SudoSubtitle']).toContain('，');
    expect(catalogs.zh_CN['Auth.SudoSubtitle']).not.toContain(',');
  });
});
