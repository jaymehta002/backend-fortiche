// File: src/app.js

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import http from "http";
import { Server } from "socket.io";
import {
  authenticateSocket,
  initializePassport,
  sessionPassport,
} from "./middlewares/auth.middleware.js";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import router from "./routes/index.js";
import { setupSocketEvents } from "./socket.js";
import MongoStore from "connect-mongo";
import mg from "./mail/mail.client.js";

import path from "path";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "https://fortiche-frontend.vercel.app",
      "localhost",
      "127.0.0.1",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("trust proxy", 1);
const corsOptions = {
  credentials: true,
  origin: [
    process.env.CLIENT_URL,
    "https://fortiche-frontend.vercel.app",
    "http://localhost:5173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
};

app.use(cors(corsOptions));

const sessionConfig = {
  store: new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 3600,
  }),
  secret: process.env.SESSION_SECRET,
  proxy: true,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "none",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.COOKIE_DOMAIN
        : undefined,
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  },
};

app.use(session(sessionConfig));

app.use((req, res, next) => {
  if (
    req.originalUrl === "/api/v1/subscription/webhook" ||
    req.originalUrl === "/api/v1/checkout/webhook"
  ) {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.resolve(process.cwd(), "public/dist")));
app.use(initializePassport());
app.use(sessionPassport());

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Setup Socket.IO events
setupSocketEvents(io);

// Routes should come BEFORE the catch-all route
app.use("/api/v1", router);
app.use(globalErrorHandler);

export { app, io };
