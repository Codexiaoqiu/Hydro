// Components
export { Link, type LinkProps } from './components/link';
export { AuthShell } from './components/auth/AuthShell';
export type { AuthShellProps } from './components/auth/AuthShell';
export { SignInDialog, showSignInDialog } from './components/auth/SignInDialog';
export {
  Alert, Button, Card, Checkbox, Chip, Eyebrow, Input, RateLimitAlert,
  Select, Switch, TagCloud, LangTabs, Avatar,
} from './components/primitives';
export type {
  AlertProps, AlertVariant, CheckboxProps, InputProps, InputType,
  RateLimitAlertProps, SwitchProps,
} from './components/primitives';

// Context
export { type PageData, usePageData } from './context/page-data';
export { type RouterState, useNavigate, useRouterState } from './context/router';

// Hooks
export { useBuildUrl } from './hooks/use-build-url';
export {
  computePostLoginRedirect, usePostLoginRedirect,
} from './hooks/use-post-login-redirect';
export type { PostLoginRedirectApi } from './hooks/use-post-login-redirect';
export { HydroClientError, request, useApi } from './hooks/use-api';
export type { RequestBody, RequestOptions, UseApiResult } from './hooks/use-api';
export {
  SignInDialogProvider, useSignInDialog, useSignInDialogState,
} from './hooks/use-sign-in-dialog';
export type { SignInDialogApi } from './hooks/use-sign-in-dialog';
export { useDisableNext } from './hooks/use-disable-next';
export type { DisableNextState } from './hooks/use-disable-next';
export { useJudgeStream } from './hooks/use-judge-stream';
export type { JudgeStreamState, JudgeUpdate } from './hooks/use-judge-stream';

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

// i18n
export { translate, useTranslate, detectLocale, resolveLocale, catalogs } from './lib/i18n';
export type { Locale, Catalog } from './lib/i18n';