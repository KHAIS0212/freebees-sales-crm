import {
    Coffee,
    Mail,
    MessageCircle,
    Users,
} from "lucide-react";

import type {ActivityType} from "@/features/activities/activity.types";

type TypeIconProps = {
    type:ActivityType;
};

export function TypeIcon({type}:TypeIconProps){
    const iconClass = "h-4 w-4";

    switch (type){
        case "CALL":
            return <MessageCircle className={iconClass}/>;

        case"RESTAURANT_VISIT":
            return<Coffee className={iconClass}/>;
        
        case"MEETING":
            return<Users className={iconClass}/>;
        
        case"EMAIL":
            return<Mail className={iconClass}/>;
    }
}