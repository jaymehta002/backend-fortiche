export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 60 * 60 * 1000, // 1 hour
  expires: new Date(Date.now() + 60 * 60 * 1000),
};

export const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 10 * 24 * 60 * 60 * 1000,
  expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
};
