import { messageService } from "./message.service.js";

export const sendMessage = async (req, res) => {
  const { receiver, content } = req.body;
  const sender = req.user._id;
  try {
    const message = await messageService.createMessage(
      sender,
      receiver,
      content,
    );
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getConversation = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  try {
    const messages = await messageService.getConversation(userId, otherUserId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  try {
    await messageService.markMessagesAsRead(userId, otherUserId);
    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUnreadMessages = async (req, res) => {
  const userId = req.user._id;
  try {
    const unreadMessages = await messageService.getAllUnreadMessages(userId);
    res.status(200).json(unreadMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllChats = async (req, res) => {
  const userId = req.user._id;
  try {
    const chats = (await messageService.getAllChats(userId));
    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLatestMessages = async (req, res) => {
  const userId = req.user._id;
  try {
    const latestMessages = await messageService.getLatestMessages(userId);
    res.status(200).json(latestMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;
  try {
    await messageService.deleteMessage(messageId, userId);
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;
  try {
    const updatedMessage = await messageService.editMessage(
      messageId,
      userId,
      content,
    );
    res.status(200).json(updatedMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
