import express from "express";
import {
  sendMessage,
  getConversation,
  markAsRead,
  getAllUnreadMessages,
  getAllChats,
  getLatestMessages,
  deleteMessage,
  editMessage,
} from "./message.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/send", auth, sendMessage);
router.get("/conversation/:otherUserId", auth, getConversation);
router.patch("/mark-read/:otherUserId", auth, markAsRead);
router.get("/unread", auth, getAllUnreadMessages);
router.get("/chats", auth, getAllChats);
router.get("/latest", auth, getLatestMessages);
router.delete("/delete/:messageId", auth, deleteMessage);
router.patch("/edit/:messageId", auth, editMessage);

export default router;
    