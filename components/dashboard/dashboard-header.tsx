export function DashboardHeader() {
  return (
    <section className="mb-8">
      <div className="flex flex-col gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-[#9F1239]">
            <span aria-hidden="true">⌁</span>
            Sales overview
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Team activity dashboard
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            Keep track of customer conversations, restaurant visits,
            and follow-ups in one place.
          </p>
        </div>
      </div>
    </section>
  );
}
