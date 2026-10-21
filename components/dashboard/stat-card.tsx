import type {ReactNode} from "react";

type StatCardProps={
    label:string;
    value:number;
    description:string;
    icon:ReactNode;
    accent:string;
};

export function StatCard({
    label,
    value,
    description,
    icon,
    accent,
}:StatCardProps){
    return (
    <div className="crm-card group rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {value.toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>{icon}</div>
      </div>
      
      <p className="mt-4 text-xs text-[var(--muted)]">{description}</p>
    </div>
  );
}