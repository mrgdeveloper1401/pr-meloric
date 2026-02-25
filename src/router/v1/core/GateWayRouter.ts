import { Router, Request, Response } from "express";
import { AppDataSource } from "../../../data-source";
import { Gateway } from "../../../entity/Gateway";
import { authenticateJWT } from "../../../middlewares/authenticate";

export const gateWayRouter = Router();

// gateway list
/**
 * @swagger
 * /v1/gateway/gateway_list:
 *   get:
 *     summary: دریافت لیست درگاه‌های فعال
 *     description: |
 *       این endpoint برای دریافت لیست درگاه‌های فعال استفاده می‌شود.
 *       نیاز به احراز هویت ندارد.
 *     tags:
 *       - Gateway
 *     responses:
 *       200:
 *         description: لیست درگاه‌ها با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "succcess"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه درگاه
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: نام درگاه
 *                         example: "زرین‌پال"
 *                       code:
 *                         type: string
 *                         description: کد درگاه
 *                         example: "zarinpal"
 *                       merchant_id:
 *                         type: string
 *                         description: شناسه پذیرنده
 *                         example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *                       is_active:
 *                         type: boolean
 *                         description: وضعیت فعال بودن درگاه
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ ایجاد
 *                         example: "2023-12-01T10:30:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ به‌روزرسانی
 *                         example: "2023-12-01T10:30:00.000Z"
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 *             example:
 *               status: false
 *               message: "server error"
 *               error: "خطای داخلی سرور"
 */
gateWayRouter.get(
  "/gateway_list/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const gateWayRepository = AppDataSource.getRepository(Gateway);
      const gateWatList = await gateWayRepository.find({
        where: {
          is_active: true,
        },
        select: {
            id: true,
            gateway_name: true
        }
      });

      return res.status(200).json({
        status: "succcess",
        data: gateWatList,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);
