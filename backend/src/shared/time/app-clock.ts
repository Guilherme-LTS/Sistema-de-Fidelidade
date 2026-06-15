const isProduction = () => process.env.NODE_ENV === 'production';

export const APP_NOW_SQL =
  "COALESCE(NULLIF(current_setting('app.fake_now', true), '')::timestamptz, NOW())";

export function getAppNowOverride(): Date | null {
  if (isProduction()) {
    return null;
  }

  const fakeNow = process.env.APP_FAKE_NOW;
  if (fakeNow) {
    const parsed = new Date(fakeNow);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const shiftDays = Number(process.env.APP_TIME_SHIFT_DAYS);
  if (Number.isFinite(shiftDays) && shiftDays !== 0) {
    return new Date(Date.now() + shiftDays * 24 * 60 * 60 * 1000);
  }

  return null;
}

export function getAppNow() {
  return getAppNowOverride() || new Date();
}
