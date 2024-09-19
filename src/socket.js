// File: src/socket.js

import { messageService } from "./message/message.service.js";
import { verifyToken } from "./services/token.service.js";
import { User } from "./user/user.model.js";

const connectedUsers = new Map();

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }
    const decodedToken = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error: " + error.message));
  }
};

export const setupSocketEvents = (io) => {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.user._id);
    const userId = socket.user._id.toString();
    connectedUsers.set(userId, socket.id);

    // Join a private room
    socket.join(userId);

    // Handle private messages
    socket.on("private message", async ({ receiverId, content }) => {
      try {
        const message = await messageService.createMessage(
          userId,
          receiverId,
          content,
        );

        // Send to receiver if online
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("private message", message);
        }

        // Send back to sender
        socket.emit("private message", message);
      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing events
    socket.on("typing", ({ receiverId }) => {
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId: userId });
      }
    });

    // Handle stop typing events
    socket.on("stop typing", ({ receiverId }) => {
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stop typing", { senderId: userId });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);
      connectedUsers.delete(userId);
      io.emit("user offline", userId);
    });
  });
};
