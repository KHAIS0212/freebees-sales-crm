import type { 
    ActivityType,
    ActivityStatus,
} from "./activity.types";
import { 
    ACTIVITY_TYPES ,
    ACTIVITY_STATUSES,
} from "./activity.constants";

export function typeLabel(type:ActivityType): string{
    return ACTIVITY_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function statusLabel(status: ActivityStatus): string{
    return (
        ACTIVITY_STATUSES.find((item) => item.value === status)?.label ?? status
    );
}