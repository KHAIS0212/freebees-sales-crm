export function formatDate(date: string){
    const parsed=new Date(date);

    if(Number.isNaN(parsed.getTime())){
        return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN",{
        day:"numeric",
        month:"short",
        year:"numeric",
        hour:"numeric",
        minute:"2-digit",
    }).format(parsed);
}