import { Transaction } from "./transaction.model.js";
import { User } from "../user/user.model.js";
import { stripe } from "../lib/stripe.js";
import { ApiError } from "../utils/APIError.js";

export const createTransaction = async ({
  fromUserId,
  toUserId,
  amount,
  type,
  orderId,
  description
}) => {
  try {
    // Create transaction record
    const transaction = await Transaction.create({
      fromUserId,
      toUserId,
      amount,
      type,
      orderId,
      description,
      status: "pending"
    });

    // If it's a purchase, handle Stripe transfer
    if (type === "purchase") {
      const toUser = await User.findById(toUserId);
      if (!toUser?.stripeAccountId) {
        throw ApiError(400, "Recipient's Stripe account not found");
      }

      const transfer = await stripe.transfers.create({
        amount: Math.floor(amount * 100), // Convert to cents
        currency: "eur",
        destination: toUser.stripeAccountId,
        transfer_group: `ORDER_${orderId}`,
      });

      transaction.stripeTransferId = transfer.id;
      transaction.status = "completed";
      await transaction.save();
    }

    return transaction;
  } catch (error) {
    console.error("Transaction creation failed:", error);
    throw error;
  }
};

export const getTransactionsByUser = async (userId, query = {}) => {
  const { page = 1, limit = 10, type, status } = query;
  const skip = (page - 1) * limit;

  const filter = {
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  };

  if (type) filter.type = type;
  if (status) filter.status = status;

  const transactions = await Transaction.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('fromUserId', 'fullName email')
    .populate('toUserId', 'fullName email')
    .populate('orderId');

  const total = await Transaction.countDocuments(filter);

  return {
    transactions,
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    total
  };
};

export const getTransactionById = async (transactionId) => {
  return await Transaction.findById(transactionId)
    .populate('fromUserId', 'fullName email')
    .populate('toUserId', 'fullName email')
    .populate('orderId');
};

export const getTransactionStats = async (userId, { startDate, endDate }) => {
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchStage = {
    $or: [{ fromUserId: userId }, { toUserId: userId }]
  };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const stats = await Transaction.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totalTransactions: [{ $count: "count" }],
        totalAmount: [
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ],
        byType: [
          {
            $group: {
              _id: "$type",
              count: { $sum: 1 },
              amount: { $sum: "$amount" }
            }
          }
        ],
        byStatus: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 }
            }
          }
        ],
        recentTransactions: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 }
        ]
      }
    }
  ]);

  return {
    totalTransactions: stats[0].totalTransactions[0]?.count || 0,
    totalAmount: stats[0].totalAmount[0]?.total || 0,
    byType: stats[0].byType,
    byStatus: stats[0].byStatus,
    recentTransactions: stats[0].recentTransactions
  };
}; 