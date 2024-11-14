import { Router } from 'express';
import { 
  getUserTransactions, 
  getTransaction,
  getTransactionStatistics
} from './transaction.controller.js';
import { auth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(auth); // Protect all transaction routes

router.get('/stats', getTransactionStatistics);
router.get('/:transactionId', getTransaction);
router.get('/', getUserTransactions);

export default router; 