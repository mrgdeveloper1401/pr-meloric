import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Artist } from "../../../../entity/Artist";


export const artistReouter = Router();

// get artist profile
/**
 * @swagger
 * components:
 *   schemas:
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         image_path:
 *           type: string
 *           example: "https://example.com/images/artist-cover.jpg"
 *     ArtistProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         monthly_listeners:
 *           type: integer
 *           example: 15000
 *         bio:
 *           type: string
 *           example: "خواننده و ترانه سرای پاپ با بیش از 10 سال سابقه فعالیت در موسیقی"
 *         cover_image:
 *           $ref: '#/components/schemas/Image'
 *     ArtistProfileResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           $ref: '#/components/schemas/ArtistProfile'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "error"
 *         message:
 *           type: string
 *           example: "Artist not found"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: "JWT Token برای احراز هویت"
 */

/**
 * @swagger
 * /v1/user/artist/artist_profile/:
 *   get:
 *     tags:
 *       - Artist
 *     summary: دریافت پروفایل آرتیست کاربر
 *     description: |
 *       دریافت اطلاعات پروفایل آرتیست کاربر جاری
 *       - کاربر باید احراز هویت شده باشد
 *       - کاربر باید دارای نقش آرتیست باشد
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - اطلاعات پروفایل آرتیست بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ArtistProfileResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   data:
 *                     id: 1
 *                     monthly_listeners: 15000
 *                     bio: "خواننده و ترانه سرای پاپ با بیش از 10 سال سابقه فعالیت در موسیقی"
 *                     cover_image:
 *                       id: 1
 *                       image_path: "https://example.com/images/artist-cover.jpg"
 *       '401':
 *         description: |
 *           عدم دسترسی
 *           - توکن JWT معتبر ارائه نشده
 *           - کاربر احراز هویت نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر احراز هویت نشده
 *                 value:
 *                   status: "error"
 *                   message: "Authentication required"
 *       '404':
 *         description: |
 *           آرتیست یافت نشد
 *           - کاربر نقش آرتیست ندارد
 *           - پروفایل آرتیست غیرفعال است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 summary: آرتیست یافت نشد
 *                 value:
 *                   status: "error"
 *                   message: "Artist not found"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 summary: خطای سرور
 *                 value:
 *                   status: "error"
 *                   message: "Internal server error"
 */
artistReouter.get(
    "/artist_profile/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const artistRepository = AppDataSource.getRepository(Artist);
            const getArtist = await artistRepository.findOne(
                {
                    where: {
                        is_active: true,
                        user: {
                            id: userId,
                            is_active: true,
                            is_artist: true
                        }
                    },
                    relations: {
                        cover_image: true
                    },
                    select: {
                        id: true,
                        monthly_listeners: true,
                        bio: true,
                        cover_image: {
                            id: true,
                            image_path: true
                        }
                    }
                }
            );
            // check artist dose exists
            if (!getArtist) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "artist not found"
                    }
                )
            }
            // return information artist
            return res.status(200).json(
                {
                    status: "success",
                    data: getArtist
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