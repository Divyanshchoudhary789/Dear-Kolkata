const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/apiError');

/**
 * Central wallet service — all wallet mutations go through here to ensure
 * atomicity and consistent balance tracking
 */

/**
 * Credit wallet balance and record transaction
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {string} category - transaction category enum
 * @param {string} description
 * @param {object} reference - { type, id } optional reference
 * @param {ObjectId} initiatedBy - admin or system
 */
const creditWallet = async (userId, amount, category, description, reference = null, initiatedBy = null) => {
  if (amount <= 0) throw new ApiError(400, 'Credit amount must be positive');

  // Use findOneAndUpdate with $inc for atomic operation
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { returnDocument: 'after', select: 'walletBalance' }
  );

  if (!user) throw new ApiError(404, 'User not found');

  const transaction = await WalletTransaction.create({
    user: userId,
    amount,
    type: 'Credit',
    category,
    description,
    reference: reference ? { type: reference.type, id: reference.id } : undefined,
    balanceAfter: user.walletBalance,
    initiatedBy,
    status: 'completed'
  });

  return { balance: user.walletBalance, transaction };
};

/**
 * Debit wallet balance and record transaction
 * @param {ObjectId} userId
 * @param {number} amount
 * @param {string} category
 * @param {string} description
 * @param {object} reference
 * @param {ObjectId} initiatedBy
 */
const debitWallet = async (userId, amount, category, description, reference = null, initiatedBy = null) => {
  if (amount <= 0) throw new ApiError(400, 'Debit amount must be positive');

  // Atomic debit — only succeeds if balance is sufficient (avoids race condition)
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { returnDocument: 'after', select: 'walletBalance' }
  );

  if (!updatedUser) {
    // Check if user exists at all to give a helpful error
    const exists = await User.exists({ _id: userId });
    if (!exists) throw new ApiError(404, 'User not found');
    // User exists but balance was insufficient
    const user = await User.findById(userId).select('walletBalance');
    throw new ApiError(400, `Insufficient wallet balance. Available: ₹${user?.walletBalance ?? 0}, Required: ₹${amount}`);
  }

  const transaction = await WalletTransaction.create({
    user: userId,
    amount,
    type: 'Debit',
    category,
    description,
    reference: reference ? { type: reference.type, id: reference.id } : undefined,
    balanceAfter: updatedUser.walletBalance,
    initiatedBy,
    status: 'completed'
  });

  return { balance: updatedUser.walletBalance, transaction };
};

/**
 * Get wallet balance for a user
 * @param {ObjectId} userId
 */
const getBalance = async (userId) => {
  const user = await User.findById(userId).select('walletBalance');
  if (!user) throw new ApiError(404, 'User not found');
  return user.walletBalance;
};

/**
 * Get paginated wallet transaction history
 * @param {ObjectId} userId
 * @param {object} options - { page, limit, type }
 */
const getTransactionHistory = async (userId, { page = 1, limit = 20, type } = {}) => {
  const query = { user: userId, status: 'completed' };
  if (type) query.type = type;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(query)
  ]);

  return {
    transactions,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    }
  };
};

module.exports = { creditWallet, debitWallet, getBalance, getTransactionHistory };
