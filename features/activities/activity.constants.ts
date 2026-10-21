import type{
    ActivityType,
    ActivityStatus,
}from "./activity.types";

export const ACTIVITY_TYPES:{
    value:ActivityType;
    label:string;
}[]=[
    {value:"CALL",label:"Call"},
    {value:"RESTAURANT_VISIT",label:"Restaurant visit"},
    {value:"MEETING",label:"Meeting"},
    {value:"EMAIL",label:"Email"},
];

export const ACTIVITY_STATUSES:{
    value:ActivityStatus;
    label:string;
}[]=[
    {value:"PENDING",label:"Pending"},
    {value:"COMPLETED",label:"Completed"},
    {value:"FOLLOW_UP_REQUIRED",label:"Follow up required"},
];

export const PAGE_SIZE=20;