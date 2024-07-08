import { Router } from "express";
import { getUser, updateUser } from "./user_controller.js";

const userRouter = Router();

userRouter.route("/:username").get(getUser);
userRouter.route("/:username").patch(updateUser);

export default userRouter;
