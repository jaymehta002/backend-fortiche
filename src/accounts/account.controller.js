import {
  initiatePaypalConnection,
  handlePaypalCallback,
} from "./account.service.js";

export const connectPaypal = async (req, res) => {
  try {
    const userId = req.user.id;
    const loginUrl = await initiatePaypalConnection(userId);
    res.json({ loginUrl });
  } catch (error) {
    console.error("Error initiating PayPal connection:", error);
    res.status(500).json({ error: "Failed to initiate PayPal connection" });
  }
};

export const paypalCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = req.user.id;

    if (state !== req.session.paypalState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    await handlePaypalCallback(userId, code);
    res.json({ message: "PayPal account linked successfully" });
  } catch (error) {
    console.error("Error in PayPal callback:", error);
    res
      .status(500)
      .json({ error: "Failed to link PayPal account", details: error.message });
  }
};
