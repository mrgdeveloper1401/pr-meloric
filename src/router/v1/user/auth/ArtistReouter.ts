import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Artist } from "../../../../entity/Artist";
import { User } from "../../../../entity/User";
import { plainToClass } from "class-transformer";
import { UpdateArtistProfile } from "../../../../dtos/auth/UpdateArtistProfile";
import { validate } from "class-validator";
import { Image } from "../../../../entity/Image";


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
                        nick_name: true,
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

// update artiste profile
/**
 * @swagger
 * /v1/user/artist/update_artist_profile/:
 *   patch:
 *     tags:
 *       - Artist
 *     summary: بروزرسانی پروفایل آرتیست
 *     description: |
 *       بروزرسانی اطلاعات پروفایل آرتیست کاربر جاری
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 nullable: true
 *                 description: بیوگرافی آرتیست
 *                 example: "بیوگرافی جدید آرتیست"
 *               cover_image:
 *                 type: integer
 *                 nullable: true
 *                 description: آیدی تصویر کاور
 *                 example: 123
 *               nick_name:
 *                  type: string
 *                  description: لقب ارتیست
 *                  example: string
 *                  nullable: true
 *           examples:
 *             example1:
 *               summary: بروزرسانی کامل
 *               value:
 *                 bio: "بیوگرافی جدید"
 *                 cover_image: 123
 *                 nick_name: "ali rezaei"
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - پروفایل آرتیست با موفقیت بروزرسانی شد
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
 *                     bio: "بیوگرافی جدید آرتیست با تجربه‌های تازه"
 *                     cover_image:
 *                       id: 456
 *                       image_path: "https://example.com/images/new-cover.jpg"
 *       '400':
 *         description: |
 *           داده‌های نامعتبر
 *           - validation error
 *           - فرمت داده‌ها صحیح نیست
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validationError:
 *                 summary: خطای اعتبارسنجی
 *                 value:
 *                   status: false
 *                   message: "invalid data"
 *                   error:
 *                     - field: "bio"
 *                       value:
 *                         maxLength: "بیوگرافی نمی‌تواند بیشتر از 500 کاراکتر باشد"
 *                     - field: "cover_image"
 *                       value:
 *                         isInt: "cover_image باید یک عدد صحیح باشد"
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
 *           منبع مورد نظر یافت نشد
 *           - آرتیست یافت نشد
 *           - تصویر مورد نظر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               artistNotFound:
 *                 summary: آرتیست یافت نشد
 *                 value:
 *                   status: false
 *                   message: "artist not found"
 *               imageNotFound:
 *                 summary: تصویر یافت نشد
 *                 value:
 *                   status: false
 *                   message: "image not found"
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
 *                   status: false
 *                   message: "server error"
 */
artistReouter.patch(
    "/update_artist_profile/",
    authenticateJWT,
    async(req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;

            // check user artist
            const artistRepository = AppDataSource.getRepository(Artist);
                        
            const checkUserArtist = await artistRepository.findOne(
                {
                    where: {
                        user: {id: userId, is_active: true, is_artist: true},
                    },
                    relations: {
                        user: true,
                        cover_image: true
                    },
                    select: {
                        id: true,
                        user: {
                            is_active: true,
                            is_artist: true
                        },
                        cover_image: {
                            id: true,
                            image_path: true
                        }
                    }
                }
            );
            if (!checkUserArtist) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "artist not found"
                    }
                );
            }

            // validate data
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }
            const updateArtistProfile = plainToClass(UpdateArtistProfile, req.body);
            const errors = await validate(updateArtistProfile);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "invalid data",
                        error: errors.map(
                            err => (
                                {
                                    field: err.property,
                                    value: err.constraints
                                }
                            )
                        )
                    }
                )
            }

            // check image
            // update
            if (req.body.cover_image !== undefined) {
                const imageRepository = AppDataSource.getRepository(Image);
                const checkImageUpload = await imageRepository.findOne(
                    {
                        where: {
                            id: updateArtistProfile.cover_image,
                            is_active: true,
                            user: {id: userId}
                        },
                        select: {id: true}
                    }
                );
                if (!checkImageUpload) {
                    return res.status(404).json(
                        {
                            status: false,
                            message: "image not found"
                        }
                    )
                }
                checkUserArtist.cover_image = checkImageUpload
            }
        
            if (req.body.bio !== undefined) {
                checkUserArtist.bio = updateArtistProfile.bio
            }

            if (req.body.nick_name !== undefined) {
                checkUserArtist.nick_name = updateArtistProfile.nick_name
            }
            // save
            await artistRepository.save(checkUserArtist);

            return res.status(200).json(
                {
                    status: "success",
                    data: updateArtistProfile
                }
            );
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }
);