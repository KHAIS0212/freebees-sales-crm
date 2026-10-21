
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export function apiError(
  message: string,
  status: number,
  noStore = true,
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      ...(noStore ? { headers: NO_STORE_HEADERS } : {}),
    },
  );
}
