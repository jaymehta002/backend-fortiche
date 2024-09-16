import Message from "./message.model.js";

const createMessage = async (senderId, receiverId, content) => {
  try {
    const message = new Message({
      senderId,
      receiverId,
      content,
    });
    return await message.save();
  } catch (error) {
    throw new Error("Error creating message: " + error.message);
  }
};

const getConversation = async (userId, otherUserId) => {
  try {
    return await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ createdAt: 1 });
  } catch (error) {
    throw new Error("Error fetching conversation: " + error.message);
  }
};

const markMessagesAsRead = async (userId, otherUserId) => {
  try {
    return await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, read: false },
      { $set: { read: true } },
    );
  } catch (error) {
    throw new Error("Error marking messages as read: " + error.message);
  }
};

const getAllUnreadMessages = async (userId) => {
  try {
    return await Message.find({ receiverId: userId, read: false }).sort({
      createdAt: -1,
    });
  } catch (error) {
    throw new Error("Error fetching unread messages: " + error.message);
  }
};

const getAllChats = async (userId) => {
  try {
    const chats = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"],
          },
          lastMessage: { $last: "$$ROOT" },
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);
    return chats;
  } catch (error) {
    throw new Error("Error fetching all chats: " + error.message);
  }
};

const getLatestMessages = async (userId) => {
  try {
    return await getAllChats(userId);
  } catch (error) {
    throw new Error("Error fetching latest messages: " + error.message);
  }
};

const deleteMessage = async (messageId, userId) => {
  try {
    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      throw new Error(
        "Message not found or you're not authorized to delete it",
      );
    }
    await message.remove();
  } catch (error) {
    throw new Error("Error deleting message: " + error.message);
  }
};

const editMessage = async (messageId, userId, newContent) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: messageId, senderId: userId },
      { content: newContent },
      { new: true },
    );
    if (!message) {
      throw new Error("Message not found or you're not authorized to edit it");
    }
    return message;
  } catch (error) {
    throw new Error("Error editing message: " + error.message);
  }
};

export const messageService = {
  createMessage,
  getConversation,
  markMessagesAsRead,
  getAllUnreadMessages,
  getAllChats,
  getLatestMessages,
  deleteMessage,
  editMessage,
};
