import mongoose from 'mongoose';

/**
 * Executes a callback within a MongoDB session/transaction.
 * If running on MongoDB Atlas or a Replica Set, uses full ACID multi-document transactions.
 * If running on a standalone local MongoDB instance, gracefully falls back while maintaining
 * atomic findOneAndUpdate operations.
 *
 * @param {Function} workFn - async function(session)
 * @returns {Promise<any>}
 */
export const runInTransaction = async (workFn) => {
  const session = await mongoose.startSession();

  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await workFn(session);
      });
      return result;
    } catch (txError) {
      // Check if error is due to standalone MongoDB (no replica set configured)
      const isReplicaSetError =
        txError.message &&
        (txError.message.includes('replica set member') ||
          txError.message.includes('Transaction numbers are only allowed'));

      if (isReplicaSetError) {
        console.warn(
          '[TransactionHelper] Standalone MongoDB detected without replica set. Executing operation atomically without multi-doc transaction.'
        );
        return await workFn(null);
      }

      throw txError;
    }
  } finally {
    await session.endSession();
  }
};

