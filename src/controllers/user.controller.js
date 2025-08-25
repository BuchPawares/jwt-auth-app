import prisma from '../utils/prisma.js';

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
