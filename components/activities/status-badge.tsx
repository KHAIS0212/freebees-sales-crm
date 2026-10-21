import{AlertCircle,CheckCircle2,Clock3} from "lucide-react"

import type { ActivityStatus } from "@/features/activities/activity.types"
import { statusLabel } from "@/features/activities/activity.utils"
type StatusBadgeProps = {
    status:ActivityStatus;
};

export function StatusBadge({ status }:StatusBadgeProps){
    const styles:Record<ActivityStatus,string>={
        PENDING:"border-amber-300 bg-amber-50 text-amber-800",
        COMPLETED:"border-emerald-300 bg-emerald-50 text-emerald-800",
        FOLLOW_UP_REQUIRED:"border-violet-300 bg-violet-50 text-violet-800",
    };

    return(
        <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium${styles[status]}`}
        >
            {status === "COMPLETED" ? (
                <CheckCircle2 className="h-3.5 w-3.5"/>
            ):status === "PENDING" ?(
                <Clock3 className="h-3.5 w-3.5"/>
            ):(
                <AlertCircle className="h-3.5 w-3.5"/>
            )}

            {statusLabel(status)}
        </span>
    )
}