
import { LoaderCircle } from "lucide-react";

export function ActivityLoadingState() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <LoaderCircle className="h-7 w-7 animate-spin text-[#9F1239]" />

      <p className="text-sm text-[var(--muted)]">
        Loading your sales activities...
      </p>
    </div>
  );
}
