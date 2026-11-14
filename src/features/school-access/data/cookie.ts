import { cookies, headers } from "next/headers";
import {
  readSchoolAccessRequestId,
  signSchoolAccessRequestId,
} from "@/features/school-access/domain/requestCookie";
import { SCHOOL_ACCESS_COOKIE } from "@/shared/config/app";
import { schoolAccessCookieOptions, shouldUseSecureCookie } from "@/shared/cookies/options";

export async function persistSchoolAccessCookie(requestId: string) {
  const jar = await cookies();
  const headerList = await headers();
  jar.set(
    SCHOOL_ACCESS_COOKIE,
    signSchoolAccessRequestId(requestId),
    schoolAccessCookieOptions(shouldUseSecureCookie(headerList.get("x-forwarded-proto"))),
  );
}

export async function readSchoolAccessCookieRequestId() {
  const jar = await cookies();
  return readSchoolAccessRequestId(jar.get(SCHOOL_ACCESS_COOKIE)?.value);
}
