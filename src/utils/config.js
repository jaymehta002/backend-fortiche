export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
  path: "/",
  maxAge: 60 * 60 * 1000,
  domain:
    process.env.NODE_ENV === "production"
      ? process.env.COOKIE_DOMAIN
      : undefined,
};

export const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 10 * 24 * 60 * 60 * 1000,
};

export const createTokenResponse = (tokens, user) => {
  const userResponse = user.toObject ? user.toObject() : user;
  delete userResponse.password;
  delete userResponse.refreshToken;

  return {
    success: true,
    data: {
      user: userResponse,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    },
  };
};
