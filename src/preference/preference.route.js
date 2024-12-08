import Router from "express";
import { getPreference, updatePreference } from "./preference.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const preferenceRouter = Router();
preferenceRouter.use(auth);
preferenceRouter.patch("/update", updatePreference);
preferenceRouter.get("/get", getPreference);

export default preferenceRouter;
