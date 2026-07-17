export { AuthShell } from './components/auth/AuthShell';
export type { AuthShellProps } from './components/auth/AuthShell';
export { showSignInDialog, SignInDialog } from './components/auth/SignInDialog';
// Components
export { Link, type LinkProps } from './components/link';
export {
  Alert, Avatar, Button, Card, Checkbox, Chip, Eyebrow, Input,
  LangTabs, RateLimitAlert, Select, Switch, TagCloud,
} from './components/primitives';
export type {
  AlertProps, AlertVariant, CheckboxProps, InputProps, InputType,
  RateLimitAlertProps, SwitchProps,
} from './components/primitives';

// Context
export { type PageData, usePageData } from './context/page-data';
export { type RouterState, useNavigate, useRouterState } from './context/router';

export { HydroClientError, request, useApi } from './hooks/use-api';
export type { RequestBody, RequestOptions, UseApiResult } from './hooks/use-api';
// Hooks
export { useBuildUrl } from './hooks/use-build-url';
export { useDisableNext } from './hooks/use-disable-next';
export type { DisableNextState } from './hooks/use-disable-next';
export { useJudgeStream } from './hooks/use-judge-stream';
export type { JudgeStreamState, JudgeUpdate } from './hooks/use-judge-stream';
export {
  computePostLoginRedirect, usePostLoginRedirect,
} from './hooks/use-post-login-redirect';
export type { PostLoginRedirectApi } from './hooks/use-post-login-redirect';
export {
  SignInDialogProvider, useSignInDialog, useSignInDialogState,
} from './hooks/use-sign-in-dialog';
export type { SignInDialogApi } from './hooks/use-sign-in-dialog';

// i18n
export { catalogs, detectLocale, resolveLocale, translate, useTranslate } from './lib/i18n';
export type { Catalog, Locale } from './lib/i18n';

// Registry
export type {
  Interceptor, InterceptorEntry, InterceptorOptions,
  PluginAPI, PluginDefinition,
  SlotName,
} from './registry';
export { defineSlot } from './registry';
// Shared dependencies
export { default as React } from 'react';

export { default as ReactDOM } from 'react-dom/client';
export { default as jsxRuntime } from 'react/jsx-runtime';
