import prisma from '../utils/prisma.js';

export const getUserswallets = async (req, res) => {
  try {
    const userId = req.userId; 

    const user = await prisma.user.findUnique({
        where:{ id: userId},
        select:{
            id: true,
            name: true,
            email: true,
        },
    });

    if(!user){
        return res.status(404).json({ message: "User not found"})
    }

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        balance: true,
      },
    });

    return res.json({
      user,
      wallets,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createWallet = async (req, res) => {
  try {
    const userId = req.userId; // ได้จาก JWT middleware
    const { name, currency, balance } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Wallet name is required" });
    }

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        name,
        currency: currency || "THB",
        balance: balance && balance > 0 ? balance : 0,
      },
      select: {
        id: true,
        name: true,
        balance: true,
        currency: true,
      },
    });

    return res.status(201).json(wallet);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const { walletId, type, amount, description, relatedWalletId } = req.body;
    const userId = req.userId; // จาก JWT Payload

    // 1. ตรวจสอบว่า wallet นี้เป็นของ user
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet || wallet.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized wallet access" });
    }

    // 2. เช็ค amount ต้องมากกว่า 0
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // 3. อัปเดต balance ตาม type
    let newBalance = wallet.balance;
    if (type === "INCOME") newBalance += amount;
    if (type === "EXPENSE") newBalance -= amount;

    if (type === "EXPENSE" && wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 4. กรณี TRANSFER (จาก wallet หนึ่งไปอีก wallet)
    if (type === "TRANSFER") {
      if (!relatedWalletId) {
        return res.status(400).json({ message: "relatedWalletId is required for transfers" });
      }

      const targetWallet = await prisma.wallet.findUnique({
        where: { id: relatedWalletId },
      });

      if (!targetWallet) {
        return res.status(404).json({ message: "Target wallet not found" });
      }

      if (wallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance for transfer" });
      }

      // หักออกจาก wallet ต้นทาง
      newBalance -= amount;
      await prisma.wallet.update({
        where: { id: relatedWalletId },
        data: { balance: targetWallet.balance + amount },
      });
    }

    // 5. สร้าง Transaction record
    const transaction = await prisma.transaction.create({
      data: {
        walletId,
        type,
        amount,
        description,
        relatedWalletId: relatedWalletId || null,
      },
    });

    // 6. อัปเดต wallet ต้นทาง
    await prisma.wallet.update({
      where: { id: walletId },
      data: { balance: newBalance },
    });

    res.json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.userId; // ได้มาจาก JWT payload
    const { walletId } = req.params; // ดึง walletId จาก path params

    // ตรวจสอบก่อนว่า wallet นี้เป็นของ user คนนี้จริงไหม
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: Number(walletId),
        userId: userId
      }
    });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found or not authorized" });
    }

    // ดึงรายการธุรกรรมทั้งหมดของ wallet นี้
    const transactions = await prisma.transaction.findMany({
      where: { walletId: Number(walletId) },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      wallet: {
        id: wallet.id,
        name: wallet.name,
        balance: wallet.balance
      },
      transactions
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};