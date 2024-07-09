export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 1000, // 1 hour
};

export const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
};
