import { Router } from 'express';
import { getUsers, checkToken } from '../controllers/user.controller.js';
import { getUserswallets, createWallet, createTransaction, getWalletTransactions  } from '../controllers/wallet.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, getUsers);
router.get('/checkToken', checkToken);
router.get('/dashboard', authMiddleware, getUserswallets);
router.post('/createWallet', authMiddleware, createWallet);
router.post('/transactions', authMiddleware, createTransaction);
router.get('/:walletId/transactions', authMiddleware, getWalletTransactions);

export default router;
