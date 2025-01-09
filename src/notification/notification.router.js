import { Router } from "express";
import { auth } from "../middlewares/auth.middleware.js";
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "./notification.controller.js";

const notificationRouter = Router();

notificationRouter.use(auth);

notificationRouter
  .get("/", getNotifications)
  .patch("/:notificationId/read", markNotificationAsRead)
  .patch("/read-all", markAllNotificationsAsRead);

export default notificationRouter;