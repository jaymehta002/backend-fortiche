import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { createTransaction, getTransactionsByUser } from "./transaction.service.js";

export const getTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const result = await getTransactionsByUser(userId, req.query);

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      "Transactions fetched successfully"
    )
  );
});

// This can be called after successful order creation
export const createPurchaseTransaction = asyncHandler(async (req, res) => {
  const { orderId, fromUserId, toUserId, amount } = req.body;

  const transaction = await createTransaction({
    fromUserId,
    toUserId,
    amount,
    type: "purchase",
    orderId,
    description: "Product purchase"
  });

  res.status(201).json(
    new ApiResponse(
      201,
      transaction,
      "Transaction created successfully"
    )
  );
}); 