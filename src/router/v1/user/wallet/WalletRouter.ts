import { Request, Response, Router } from "express";
import { AppDataSource } from "../../../../data-source";
import { Wallet } from "../../../../entity/Wallet";
import { authenticateJWT } from "../../../../middlewares/authenticate";


export const wallerRouter = Router()

/**
 * @swagger
 * /v1/user/wallet/balance:
 *   get:
 *     summary: دریافت موجودی کیف پول
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: موجودی کیف پول
 */
wallerRouter.get(
  "/balance",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;

      const walletRepository = AppDataSource.getRepository(Wallet);
      const wallet = await walletRepository.findOne({
        where: { 
          user: { id: userId, is_active: true },
          is_active: true 
        },
        select: ["id", "balance", "createdAt"]
      });

      if (!wallet) {
        // create wallet if dose not exists
        const newWallet = walletRepository.create({
          user: { id: userId },
          balance: 0
        });
        await walletRepository.save(newWallet);
        
        return res.status(200).json({
          status: "success",
          data: {
            balance: 0,
            currency: "تومان"
          }
        });
      }

      return res.status(200).json({
        status: "success",
        data: {
          balance: wallet.balance,
          currency: "تومان"
        }
      });

    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Server error"
      });
    }
  }
);