
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type PageFeedbackProps = {
  pageError: string;
  successMessage: string;
  onRetry: () => void;
  onDismissSuccess: () => void;
};

export function PageFeedback({
  pageError,
  successMessage,
  onRetry,
  onDismissSuccess,
}: PageFeedbackProps) {
  return (
    <>
      {pageError && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{pageError}</p>
          </div>

          <button
            type="button"
            onClick={onRetry}
            className="self-start font-semibold underline underline-offset-4 sm:self-auto"
          >
            Try again
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[80] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-xl shadow-slate-900/10"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

          <p>{successMessage}</p>

          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismissSuccess}
            className="ml-1 rounded-lg p-1 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
