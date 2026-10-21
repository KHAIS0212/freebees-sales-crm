
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
} from "lucide-react";

import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
} from "@/features/activities/activity.constants";

import type {
  ActivityStatus,
  ActivityType,
} from "@/features/activities/activity.types";

type CustomerBranch = {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  brandId: string | null;
  brandName: string | null;
};
type BranchAction = "use_existing" | "create_branch";

type BranchSnapshot = {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
};

type ActivityFormProps = {
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  customerEmail: string;
  setCustomerEmail: (value: string) => void;

  customerId: string | null;
  setCustomerId: (value: string | null) => void;
  brandId: string | null;
  setBrandId: (value: string | null) => void;
  customerLocation: string;
  setCustomerLocation: (value: string) => void;

  activityType: ActivityType;
  setActivityType: (value: ActivityType) => void;
  status: ActivityStatus;
  setStatus: (value: ActivityStatus) => void;
  notes: string;
  setNotes: (value: string) => void;

  formError: string;
  saving: boolean;
  handleSubmit: (branchAction?: BranchAction) => void;
  onCancel: () => void;
};

type SearchResponse = {
  customers?: CustomerBranch[];
  error?: string;
};

export default function ActivityForm({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  customerEmail,
  setCustomerEmail,
  customerId,
  setCustomerId,
  setBrandId,
  customerLocation,
  setCustomerLocation,
  activityType,
  setActivityType,
  status,
  setStatus,
  notes,
  setNotes,
  formError,
  saving,
  handleSubmit,
  onCancel,
}: ActivityFormProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedBranch, setSelectedBranch] =
  useState<BranchSnapshot | null>(null);

const [showBranchConfirmation, setShowBranchConfirmation] =
  useState(false);


useEffect(() => {
  const query =
    searchOpen && customerName.trim().length >= 3
      ? customerName.trim()
      : "";

  const timer = window.setTimeout(
    () => {
      setDebouncedQuery(query);

      if (!query) {
        setBranches([]);
        setSearchLoading(false);
        setSearchError("");
      }
    },
    query ? 300 : 0,
  );

  return () => window.clearTimeout(timer);
}, [customerName, searchOpen]);


  useEffect(() => {
    if (!searchOpen || debouncedQuery.length < 3) {
      return;
    }

    const controller = new AbortController();

    async function searchCustomers() {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/customers/search?q=${encodeURIComponent(debouncedQuery)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const body = (await response.json()) as SearchResponse;

        if (!response.ok) {
          throw new Error(
            body.error || "Unable to search restaurant branches.",
          );
        }

        setBranches(Array.isArray(body.customers) ? body.customers : []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setBranches([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Unable to search restaurant branches.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }

    void searchCustomers();

    return () => controller.abort();
  }, [debouncedQuery, searchOpen]);

function selectBranch(branch: CustomerBranch) {
  setSelectedBranch({
    id: branch.id,
    name: branch.name,
    location: branch.location ?? "",
    phone: branch.phone ?? "",
    email: branch.email ?? "",
  });

  setCustomerId(branch.id);
  setBrandId(branch.brandId);
  setCustomerName(branch.name);
  setCustomerLocation(branch.location ?? "");
  setCustomerPhone(branch.phone ?? "");
  setCustomerEmail(branch.email ?? "");

  setShowBranchConfirmation(false);
  setBranches([]);
  setSearchOpen(false);
  setSearchError("");
}

  const hasEditedSelectedBranch = Boolean(
    customerId &&
      selectedBranch &&
      selectedBranch.id === customerId &&
      (
        customerName.trim() !== selectedBranch.name.trim() ||
        customerPhone.trim() !== selectedBranch.phone.trim() ||
        customerEmail.trim().toLowerCase() !==
          selectedBranch.email.trim().toLowerCase() ||
        customerLocation.trim() !== selectedBranch.location.trim()
      ),
  );

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasEditedSelectedBranch) {
      setShowBranchConfirmation(true);
      return;
    }

    setShowBranchConfirmation(false);
    handleSubmit();
  }


  return (
    <section className="crm-card mb-8 rounded-2xl p-5 sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-[#9F1239]">
          <Plus className="h-5 w-5" />
        </div>

        <div>
          <h3 className="text-lg font-semibold">Record an activity</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Add a customer interaction to your sales history.
          </p>
        </div>
      </div>

      <form onSubmit={onFormSubmit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="relative">
            <label htmlFor="customerName" className="crm-label">
              Customer / restaurant name
            </label>

            <div className="relative">
              <input
                id="customerName"
                name="customerName"
                type="text"
                required
                maxLength={120}
                autoComplete="off"
                value={customerName}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search or enter e.g. Chicking"
                className="crm-input pr-10"
              />

              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>

            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Type at least 3 characters to find existing restaurants.
            </p>

            {searchOpen &&
  customerName.trim().length >= 3 &&
  debouncedQuery === customerName.trim() && (
              <div
                id="customer-branch-results"
                className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-xl"
              >
                {searchLoading && (
                  <div className="flex items-center gap-2 p-3 text-sm text-[var(--muted)]">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Searching restaurants...
                  </div>
                )}

                {!searchLoading && searchError && (
                  <p role="alert" className="p-3 text-sm text-red-600">
                    {searchError}
                  </p>
                )}

                {!searchLoading &&
                  !searchError &&
                  branches.length === 0 &&
                  debouncedQuery.length >= 3 && (
                    <p className="p-3 text-sm text-[var(--muted)]">
                      No matching branches found. You can add this restaurant
                      as a new brand.
                    </p>
                  )}

                {!searchLoading &&
                  branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => selectBranch(branch)}
                      className="block w-full border-b border-[var(--border)] p-3 text-left last:border-b-0 hover:bg-[var(--hover)]"
                    >
                      <span className="block font-medium">
                        {branch.brandName ?? branch.name}
                      </span>

                      <span className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {branch.location || "Location not specified"}
                      </span>

                      {(branch.phone || branch.email) && (
                        <span className="mt-1 block break-words text-xs text-[var(--muted)]">
                          {[branch.phone, branch.email]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() => {
                    setCustomerId(null);
                    setBrandId(null);
                    setCustomerLocation("");
                    setCustomerPhone("");
                    setCustomerEmail("");
                    setSearchOpen(false);
                    setBranches([]);
                    setSearchError("");
                    setSelectedBranch(null);
                    setShowBranchConfirmation(false);
                  }}
                  className="w-full border-t border-[var(--border)] p-3 text-left text-sm font-medium text-[#9F1239] hover:bg-[var(--hover)]"
                >
                  + Add as a new restaurant brand
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="customerLocation" className="crm-label">
              Branch location
            </label>

            <input
              id="customerLocation"
              name="customerLocation"
              type="text"
              maxLength={200}
              value={customerLocation}
              onChange={(event) => setCustomerLocation(event.target.value)}
              placeholder="e.g. Kochi"
              className="crm-input"
            />
          </div>

          <div>
            <label htmlFor="customerPhone" className="crm-label">
              Contact phone{" "}
              <span className="font-normal text-[var(--muted)]">
                (optional)
              </span>
            </label>

            <input
              id="customerPhone"
              name="customerPhone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="crm-input"
            />
          </div>

          <div>
            <label htmlFor="customerEmail" className="crm-label">
              Contact email{" "}
              <span className="font-normal text-[var(--muted)]">
                (optional)
              </span>
            </label>

            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="e.g. contact@restaurant.com"
              className="crm-input"
            />
          </div>

          <div>
            <label htmlFor="activityType" className="crm-label">
              Activity type
            </label>

            <div className="relative">
              <select
                id="activityType"
                name="activityType"
                value={activityType}
                onChange={(event) =>
                  setActivityType(event.target.value as ActivityType)
                }
                className="crm-input appearance-none pr-10"
              >
                {ACTIVITY_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="crm-label">
              Status
            </label>

            <div className="relative">
              <select
                id="status"
                name="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ActivityStatus)
                }
                className="crm-input appearance-none pr-10"
              >
                {ACTIVITY_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="crm-label">
              Notes{" "}
              <span className="font-normal text-[var(--muted)]">
                (optional)
              </span>
            </label>

            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Discussed pricing, menu, or next steps..."
              className="crm-input min-h-24 resize-y"
            />

            <p className="mt-1.5 text-right text-xs text-[var(--muted)]">
              {notes.length}/2000
            </p>
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        {showBranchConfirmation && (
          <div
            role="dialog"
            aria-labelledby="branch-confirmation-title"
            aria-describedby="branch-confirmation-description"
            className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
          >
            <h4
              id="branch-confirmation-title"
              className="font-semibold"
            >
              You edited an existing branch
            </h4>

            <p
              id="branch-confirmation-description"
              className="mt-2 text-sm text-[var(--muted)]"
            >
              How should we handle these changes? The existing branch and its
              location will remain unchanged.
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowBranchConfirmation(false);
                  handleSubmit("use_existing");
                }}
                className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--hover)] disabled:opacity-50"
              >
                Use edited details for this activity
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setShowBranchConfirmation(false);
                  handleSubmit("create_branch");
                }}
                className="rounded-lg bg-[#9F1239] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#881337] disabled:opacity-50"
              >
                Create a new branch
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => setShowBranchConfirmation(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[var(--hover)] disabled:opacity-50"
              >
                Go back
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-medium transition hover:bg-[var(--hover)] disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9F1239] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#881337] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Saving activity...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save activity
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
