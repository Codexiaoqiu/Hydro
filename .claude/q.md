installHook.js:1 TypeError: statementLangs.map is not a function
    at ProblemForm (ProblemForm.tsx:286:39)


The above error occurred in the <ProblemForm> component.

React will try to recreate this component tree from scratch using the error boundary you provided, SlotErrorBoundary.
installHook.js:1 [Hydro] SlotErrorBoundary(page:problem_edit/renderer) TypeError: statementLangs.map is not a function
    at ProblemForm (ProblemForm.tsx:286:39)
 
    at ProblemForm (http://localhost:8000/src/components/problem/ProblemForm.tsx:24:31)
    at ProblemEditPage (http://localhost:8000/src/pages/problem_edit.tsx:9:19)
    at Suspense (<anonymous>)
    at http://localhost:8000/src/components/layout.tsx:10:48
    at ToastProvider (http://localhost:8000/src/components/primitives/Toast.tsx:8:33)
    at Suspense (<anonymous>)
    at SlotErrorBoundary (http://localhost:8000/src/registry/error-boundary.tsx:4:8)
    at http://localhost:8000/src/app.tsx:14:35
    at SlotErrorBoundary (http://localhost:8000/src/registry/error-boundary.tsx:4:8)
    at SlotErrorBoundary (http://localhost:8000/src/registry/error-boundary.tsx:4:8)
    at SlotComponent (http://localhost:8000/src/registry/slot.tsx:45:19)
    at RouterProvider (http://localhost:8000/src/context/router.tsx:30:34)
    at PageDataProvider (http://localhost:8000/src/context/page-data.tsx:10:36)
    at SignInDialogProvider (http://localhost:8000/src/hooks/use-sign-in-dialog.ts:25:40)
    at ThemeProvider (http://localhost:8000/src/theme/ThemeProvider.tsx:21:33)