
type ActivityNotesModalProps = {
  customerName: string;
  notes: string;
  onClose: () => void;
};

export function ActivityNotesModal({
  customerName,
  notes,
  onClose,
}: ActivityNotesModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-note-title"
        className="crm-card max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div className="min-w-0">
            <h3 id="full-note-title" className="text-lg font-semibold">
              Activity notes
            </h3>

            <p className="mt-1 break-words text-sm text-[var(--muted)]">
              {customerName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close full note"
            className="shrink-0 rounded-lg p-2 transition hover:bg-[var(--hover)]"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">
          <p className="whitespace-pre-wrap break-words text-sm leading-7">
            {notes}
          </p>
        </div>

        <div className="flex justify-end border-t border-[var(--border)] p-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#9F1239] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#881337]"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
