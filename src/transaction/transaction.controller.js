import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/APIResponse.js";
import { ApiError } from "../utils/APIError.js";
import { 
  getTransactionsByUser, 
  createTransaction,
  getTransactionById,
  getTransactionStats
} from "./transaction.service.js";

// Get all transactions for a user with filtering and pagination
export const getUserTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { 
    page = 1, 
    limit = 10, 
    type, 
    status,
    startDate,
    endDate,
    sortBy = "createdAt",
    order = "desc"
  } = req.query;

  const result = await getTransactionsByUser(userId, {
    page,
    limit,
    type,
    status,
    startDate,
    endDate,
    sortBy,
    order
  });

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      "Transactions fetched successfully"
    )
  );
});

// Get transaction details by ID
export const getTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const userId = req.user._id;

  const transaction = await getTransactionById(transactionId);

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  // Ensure user has access to this transaction
  if (transaction.fromUserId.toString() !== userId.toString() && 
      transaction.toUserId.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized access to transaction");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      transaction,
      "Transaction details fetched successfully"
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