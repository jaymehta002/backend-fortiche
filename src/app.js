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
    "*",
    process.env.CLIENT_URL,
    "https://fortiche-frontend.vercel.app",
    "localhost",
    "127.0.0.1",
    "http://localhost:5173/",
    "http://localhost:5173",
  ],
};

app.use(cors(corsOptions));

const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? ".vercel.app" : "localhost";

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
app.use(express.static("public"));
app.use(initializePassport());
app.use(sessionPassport());

// Socket.IO authentication middleware
io.use(authenticateSocket);

// Setup Socket.IO events
setupSocketEvents(io);

app.get("/", (req, res) => {
  res.send("hello world");
});

// Routes
app.use("/api/v1", router);
app.use(globalErrorHandler);

export { app, io };
