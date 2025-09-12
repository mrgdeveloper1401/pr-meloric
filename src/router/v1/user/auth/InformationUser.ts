import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";


export const informationUserRouter = Router();

/**
 * @swagger
 * /v1/user/information/base_user:
 *   get:
 *     summary: دریافت اطلاعات پایه کاربر
 *     description: دریافت اطلاعات اصلی کاربر احراز هویت شده
 *     tags: [User-Information]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: اطلاعات کاربر با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/BaseUserResponse'
 *       404:
 *         description: کاربر پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
informationUserRouter.get(
    '/base_user/',
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            // get user
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_active: true},
                    select: {
                        createdAt: true,
                        updatedAt: true,
                        id: true,
                        mobile_phone: true,
                        email: true,
                        username: true,
                        is_artist: true,
                        is_public: true
                    }
                }
            );
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: "false",
                        message: "user not found"
                    }
                )
            }

            return res.status(200).json(
                {
                    status: "success",
                    data: getUser
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            )
        }
    }
)
