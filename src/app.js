import cookieParser from "cookie-parser";
import cors from "cors";
import { globalErrorHandler } from "./middlewares/globalErrorHandler.js";
import express from "express";
import session from "express-session";
import router from "./routes/index.js";
import { initializePassport, sessionPassport } from "./middlewares/auth.middleware.js";
const app = express();

const corsOptions = {
  credentials: true,
  origin: [
    process.env.CLIENT_URL,
    "localhost",
    "127.0.0.1",
    "http://localhost:5173",
  ],
};

app.use(cors(corsOptions));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true, 
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

app.use(express.json({ limit: "14kb" }));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "14kb" }));
app.use(express.static("public"));

app.use(initializePassport());
app.use(sessionPassport());

app.get("/", (req, res) => {
  res.send("hello world");
});
// Routes
app.use("/api/v1", router);

app.use(globalErrorHandler);

export { app };
