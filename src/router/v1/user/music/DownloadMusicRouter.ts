import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { DownloadMusics } from "../../../../entity/Donwloads";
import { plainToClass } from "class-transformer";
import { DownloadMusicDto } from "../../../../dtos/music/CreateDownloadMusic";
import { validate } from "class-validator";
import { Song } from "../../../../entity/Song";
import { User } from "../../../../entity/User";

export const downloadRouter = Router();

// download list music
/**
 * @swagger
 * components:
 *   schemas:
 *     DownloadItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: شناسه رکورد دانلود
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ ایجاد رکورد دانلود
 *           example: "2024-01-15T10:30:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ به‌روزرسانی رکورد دانلود
 *           example: "2024-01-16T14:20:00.000Z"
 *         music_id:
 *           type: integer
 *           description: شناسه موزیک
 *           example: 123
 *         music_title:
 *           type: string
 *           description: عنوان موزیک
 *           example: "Disafine"
 *         audio:
 *           type: string
 *           description: آدرس فایل صوتی
 *           example: "https://storage.com/uploads/audio/song.mp3"
 *         music_cover_image:
 *           type: string
 *           nullable: true
 *           description: آدرس تصویر کاور موزیک
 *           example: "https://storage.com/uploads/images/cover.jpg"
 *         artist_first_name:
 *           type: string
 *           nullable: true
 *           description: نام هنرمند
 *           example: "ماهیر"
 *         artist_last_name:
 *           type: string
 *           nullable: true
 *           description: نام خانوادگی هنرمند
 *           example: "محمدی"
 *         play_count:
 *           type: integer
 *           description: تعداد پخش موزیک
 *           example: 1500
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: تعداد کل آیتم‌ها
 *           example: 45
 *         page:
 *           type: integer
 *           description: شماره صفحه فعلی
 *           example: 1
 *         limit:
 *           type: integer
 *           description: تعداد آیتم‌ها در هر صفحه
 *           example: 20
 *         totalPages:
 *           type: integer
 *           description: تعداد کل صفحات
 *           example: 3
 *     DownloadsListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: وضعیت درخواست
 *           example: "success"
 *         pagination:
 *           $ref: '#/components/schemas/PaginationInfo'
 *         data:
 *           type: array
 *           description: لیست موزیک‌های دانلود شده
 *           items:
 *             $ref: '#/components/schemas/DownloadItem'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *   parameters:
 *     PageQueryParam:
 *       name: page
 *       in: query
 *       required: false
 *       description: شماره صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *         example: 1
 *     LimitQueryParam:
 *       name: limit
 *       in: query
 *       required: false
 *       description: تعداد آیتم‌ها در هر صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 50
 *         default: 20
 *         example: 20
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /v1/user/downloads/list:
 *   get:
 *     tags:
 *       - Downloads
 *     summary: دریافت لیست موزیک‌های دانلود شده
 *     description: |
 *       دریافت لیست تمام موزیک‌هایی که کاربر دانلود کرده است
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - فقط موزیک‌های فعال نمایش داده می‌شوند
 *       - اطلاعات کامل موزیک، هنرمند و فایل صوتی برگردانده می‌شود
 *       - قابلیت صفحه‌بندی دارد (حداکثر 50 آیتم در هر صفحه)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQueryParam'
 *       - $ref: '#/components/parameters/LimitQueryParam'
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست موزیک‌های دانلود شده بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DownloadsListResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   pagination:
 *                     total: 45
 *                     page: 1
 *                     limit: 20
 *                     totalPages: 3
 *                   data:
 *                     - id: 1
 *                       artist_id: 1
 *                       created_at: "2024-01-15T10:30:00.000Z"
 *                       updated_at: "2024-01-16T14:20:00.000Z"
 *                       music_id: 123
 *                       music_title: "Disafine"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song1.mp3"
 *                       music_cover_image: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/images/cover1.jpg"
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 1500
 *                     - id: 2
 *                       created_at: "2024-01-14T15:45:00.000Z"
 *                       updated_at: "2024-01-14T15:45:00.000Z"
 *                       music_id: 124
 *                       music_title: "Navar Maghz"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song2.mp3"
 *                       music_cover_image: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/images/cover2.jpg"
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 890
 *                     - id: 3
 *                       created_at: "2024-01-13T09:20:00.000Z"
 *                       updated_at: "2024-01-13T09:20:00.000Z"
 *                       music_id: 125
 *                       music_title: "Bishaw Az Hamizhe"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song3.mp3"
 *                       music_cover_image: null
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 1200
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_parameters:
 *                 summary: پارامترهای صفحه‌بندی نامعتبر
 *                 value:
 *                   status: false
 *                   message: "Invalid pagination parameters"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر لاگین نکرده است
 *                 value:
 *                   status: false
 *                   message: "Authentication required"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "Internal server error"
 */
downloadRouter.get(
    "/list",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;

            const downloadRepository = AppDataSource.getRepository(DownloadMusics);
            const [downloads, total] = await downloadRepository.findAndCount({
                where: {
                    user: { id: userId },
                    is_active: true
                },
                relations: {
                    song: {
                        audio: true,
                        image: true,
                        artist: true,
                        album: {
                            user: {
                                profile: true
                            }
                        }
                    },
                },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    song: {
                        id: true,
                        title: true,
                        play_count: true,
                        artist: {
                            id: true,
                        },
                        audio: {
                            audio_file_path: true
                        },
                        image: {
                            image_path: true
                        },
                        album: {
                            id: true,
                            // title: true,
                            user: {
                                id: true,
                                profile: {
                                    id: true,
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        }
                    },

                },
                order: { createdAt: "DESC" },
                skip,
                take: limit
            });

            const simpleData = downloads.map(
                item => (
                    {
                        id: item.id,
                        artist_id: item.song.artist.id,
                        created_at: item.createdAt,
                        updated_at: item.updatedAt,
                        music_id: item.song.id,
                        music_title: item.song.title,
                        audio: item.song.audio.audio_file_path,
                        music_cover_image: item.song.image?.image_path || null,
                        artist_first_name: item.song.album.user.profile?.first_name || null,
                        artist_last_name: item.song.album.user.profile?.last_name || null,
                        play_count: item.song.play_count

                    }
                )
            )
            return res.status(200).json({
                status: "success",
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                data: simpleData,
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);


// add music into download music
/**
 * @swagger
 * components:
 *   schemas:
 *     DownloadMusicDto:
 *       type: object
 *       required:
 *         - music_id
 *       properties:
 *         music_id:
 *           type: integer
 *           description: شناسه موزیک برای دانلود
 *           example: 123
 *     DownloadSuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         message:
 *           type: string
 *           example: "successfully add data"
 *     ValidationError:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Invalid Data"
 *         error:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: "music_id"
 *               value:
 *                 type: object
 *                 properties:
 *                   isNumber:
 *                     type: string
 *                     example: "music_id must be a number"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /v1/user/downloads/download/add:
 *   post:
 *     tags:
 *       - Downloads
 *     summary: افزودن موزیک به لیست دانلود شده‌ها
 *     description: |
 *       افزودن یک موزیک به لیست دانلود شده‌های کاربر
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - موزیک باید فعال (is_active=true) باشد
 *       - کاربر نمی‌تواند یک موزیک را دو بار به دانلود شده‌ها اضافه کند
 *       - در صورت وجود قبلی، خطای مناسب بازگردانده می‌شود
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DownloadMusicDto'
 *           examples:
 *             example1:
 *               summary: نمونه درخواست
 *               value:
 *                 music_id: 123
 *     responses:
 *       '201':
 *         description: موزیک با موفقیت به دانلود شده‌ها اضافه شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DownloadSuccessResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   message: "successfully add data"
 *       '400':
 *         description: خطای اعتبارسنجی یا موزیک قبلاً اضافه شده
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationError'
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation_error:
 *                 summary: خطای اعتبارسنجی
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   error:
 *                     - field: "music_id"
 *                       value:
 *                         isNumber: "music_id must be a number"
 *               already_exists:
 *                 summary: موزیک قبلاً اضافه شده
 *                 value:
 *                   status: false
 *                   message: "music download already exists"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر لاگین نکرده است
 *                 value:
 *                   status: false
 *                   message: "Authentication required"
 *       '404':
 *         description: موزیک یا کاربر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               music_not_found:
 *                 summary: موزیک یافت نشد
 *                 value:
 *                   status: false
 *                   message: "music not found"
 *               user_not_found:
 *                 summary: کاربر یافت نشد
 *                 value:
 *                   status: false
 *                   message: "user not found"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "server error"
 */
downloadRouter.post(
    "/download/add",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const downloadMusicDto = plainToClass(DownloadMusicDto, req.body)
            const errors = await validate(downloadMusicDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        error: errors.map(
                            err => (
                                {
                                    field: err.property,
                                    value: err.constraints
                                }
                            )
                        )
                    }
                );
            }

            // check music
            const musicRepository = AppDataSource.getRepository(Song);
            const getMusic = await musicRepository.findOne(
                {
                    where: {
                        id: downloadMusicDto.music_id,
                        is_active: true
                    },
                    select: {
                        id: true
                    }
                }
            );
            if (!getMusic) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "music not found"
                    }
                )
            }
            
            // check user
            const userRepository = AppDataSource.getRepository(User);
            const checkUser = await userRepository.findOne(
                {
                    where: {
                        id: Number(userId),
                        is_active: true
                    },
                    select: {id: true}
                }
            );
            if (!checkUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                )
            }
            
            // check download exists
            const downloadMusicRepository = AppDataSource.getRepository(DownloadMusics);
            const checkDownloadMusic = await downloadMusicRepository.findOne(
                {
                    where: {
                        user: checkUser,
                        is_active: true,
                        song: getMusic
                    },
                    select: {
                        id: true
                    },
                },
            )
            if (checkDownloadMusic) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "music download already exists"
                    }
                )
            }
            // add music into downloads
            const donwload = new DownloadMusics();
            donwload.song = getMusic;
            donwload.user = checkUser
            await DownloadMusics.save(donwload);
            // donwload.download_count += 1;

            // return data
            return res.status(201).json(
                {
                    status: "success",
                    message: "successfly add data"
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