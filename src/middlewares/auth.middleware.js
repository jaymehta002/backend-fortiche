import { User } from "../user/user.model.js";
import { verifyToken } from "../services/token.service.js";
import { ApiError } from "../utils/APIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.LIVE_URL}/auth/google/callback`,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = new User({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            username: `user${Math.random().toString(36).substr(2, 9)}`, // Generate a random username
            password: Math.random().toString(36).slice(-8), // Generate a random password
            avatar: profile.photos[0].value,
          });
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    },
  ),
);

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export const initializePassport = () => {
  return passport.initialize();
};

export const sessionPassport = () => {
  return passport.session();
};

export const auth = asyncHandler(async (req, _, next) => {
  try {
    // Modified token extraction logic
    const token =
      req.headers.authorization?.replace("Bearer ", "") || // Prioritize Authorization header
      req.cookies?.accessToken ||
      req.query.token ||
      req.body.token;

    if (!token) {
      throw ApiError(401, "Authentication required");
    }

    const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw ApiError(401, "Invalid Access Token");
    }

    
    if (user.isDeleted) {
      throw ApiError(401, "Account has been deleted.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});

export const authenticateSocket = async (socket, next) => {
  try {
    // Modified token extraction for socket
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      return next(new Error("Authentication error: Invalid token"));
    }

    if (user.isDeleted) {
      throw new ApiError(403, "Account has been deleted.");
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error: " + error.message));
  }
};
