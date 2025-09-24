import { Request, Response, Router } from "express";
import { AppDataSource } from "../../../../data-source";
import { Genre } from "../../../../entity/Genre";

export const genreRouter = Router();

// genre list
/**
 * @swagger
 * /v1/user/genre/genre_list/:
 *   get:
 *     summary: دریافت لیست تمام ژانرهای فعال
 *     description: |
 *       این endpoint برای دریافت لیست تمام ژانرهای فعال موسیقی استفاده می‌شود.
 *       نیاز به احراز هویت ندارد.
 *     tags:
 *       - Genres
 *     responses:
 *       200:
 *         description: لیست ژانرها با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه ژانر
 *                         example: 1
 *                       name:
 *                         type: string
 *                         description: نام ژانر
 *                         example: "پاپ"
 *                       description:
 *                         type: string
 *                         description: توضیحات ژانر
 *                         example: "موسیقی پاپ ایرانی"
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
 *                   example: "server error"
 */
genreRouter.get(
    "/genre_list/",
    async (req: Request, res: Response) => {
        try {
            const genreRepository = AppDataSource.getRepository(Genre);
            const allGenre = await genreRepository.find(
                {
                    where: {is_active: true},
                    relations: {
                        image: true
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image: {
                            id: true,
                            image_path: true
                        }
                    }
                },
            )

            // return data
            return res.status(200).json(
                {
                    status: "success",
                    data: allGenre
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
);

