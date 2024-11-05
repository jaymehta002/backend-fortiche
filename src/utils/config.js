export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  expires: new Date(Date.now() + 60 * 60 * 1000),
  partitioned: true,
  priority: "high",
};

export const refreshCookieOptions = {
  ...cookieOptions,
  expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
};
