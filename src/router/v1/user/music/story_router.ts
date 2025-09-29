import express from "express";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Story } from "../../../../entity/Story";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { In, MoreThan } from "typeorm";
import { User } from "../../../../entity/User";
import { s3ClientConfig, videoUploaded } from "../../../../utils/amazon_s3/S3Config";
import fs from "fs";
import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { MediaTypeEnum, StoryMedia } from "../../../../entity/StoryMedia";
import dotenv from "dotenv"
import { getVideoDurationInSeconds } from 'get-video-duration';
import { plainToClass } from "class-transformer";
import { CreateStoryDto } from "../../../../dtos/music/CreateStory";
import { validate } from "class-validator";

export const storyRouter = express.Router();
dotenv.config()


// Create story with multiple media
/**
 * @swagger
 * /v1/user/story/story/create_story_with_media/:
 *   post:
 *     summary: ایجاد استوری جدید با استفاده از مدیاهای آپلود شده
 *     description: |
 *       این endpoint برای ایجاد یک استوری جدید با استفاده از مدیاهای از قبل آپلود شده استفاده می‌شود.
 *       کاربر باید مدیاها را قبلاً آپلود کرده و شناسه‌های آنها را ارسال کند.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - media_ids
 *             properties:
 *               caption:
 *                 type: string
 *                 description: توضیحات اختیاری استوری
 *                 example: "این یک استوری تست است!"
 *                 nullable: true
 *               media_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: آرایه‌ای از شناسه‌های مدیاهای آپلود شده
 *                 example: [1, 2, 3, 4]
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: استوری با مدیاها با موفقیت ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Story with media created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/StoryWithMedia'
 *       400:
 *         description: درخواست نامعتبر
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
 *                   example: "request body is required"
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "media_ids"
 *                       value:
 *                         type: object
 *                         example: { "isNumber": "each value in media_ids must be a number" }
 *       404:
 *         description: مدیا یافت نشد
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
 *                   example: "story media dose not exits"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.post(
    "/story/create_story_with_media/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user by request
            const userId = (req as any).user.user_id;

            // check request body
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                )
            }

            // validate dto
            const createStoryDto = plainToClass(CreateStoryDto, req.body)
            const errors = await validate(createStoryDto)
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
                );
            }

            // check media
            const storyMediaRepository = AppDataSource.getRepository(StoryMedia);
            const checkStoryMedia = await storyMediaRepository.find(
                {
                    where: {
                        id: In(createStoryDto.media_ids),
                        is_active: true,
                        user: {id: userId}
                    },
                    select: {
                        id: true
                    }
                }
            );
            if (!checkStoryMedia) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "story media dose not exits"
                    }
                )
            }

            // create story
            const storyRepository = AppDataSource.getRepository(Story);
            const newStory = new Story();
            newStory.caption = createStoryDto.caption;
            newStory.user = {id: userId} as User;
            newStory.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
            newStory.view_count = 0;
            newStory.is_active = true;

            // save story
            await storyRepository.save(newStory);

            // update media
            const updatePromises = checkStoryMedia.map(
                async (media) => {
                    media.story = newStory;
                    return await storyMediaRepository.save(media);
                }
            )
            await Promise.all(updatePromises);
    
            return res.status(201).json({
                status: "success",
                message: "Story with media created successfully",
                data: {
                    id: newStory.id
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// Get story detail
/**
 * @swagger
 * /v1/user/story/story/{story_id}/:
 *   get:
 *     summary: دریافت جزئیات استوری
 *     description: |
 *       این endpoint برای دریافت جزئیات کامل یک استوری شامل تمام مدیاهای آن استفاده می‌شود.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه استوری
 *     responses:
 *       200:
 *         description: جزئیات استوری با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/StoryWithMedia'
 *       404:
 *         description: استوری یافت نشد
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
 *                   example: "Story not found"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.get(
    "/story/:story_id/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const storyId = parseInt(req.params.story_id);

            const storyRepository = AppDataSource.getRepository(Story);
            const story = await storyRepository.findOne({
                where: { 
                    id: storyId,
                    is_active: true 
                },
                relations: [
                    "media", 
                    "user", 
                    "user.profile",
                    "user.profile.profile_image"
                ],
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    caption: true,
                    media: true,
                    view_count: true,
                    user: {
                        id: true,
                        username: true,
                        profile: {
                            id: true,
                            profile_image: {
                                id: true,
                                image_path: true
                            }
                        }
                    }
                }
            });

            if (!story) {
                return res.status(404).json({
                    status: false,
                    message: "Story not found"
                });
            }

            // افزایش تعداد بازدیدها
            story.view_count += 1;
            await storyRepository.save(story);

            return res.status(200).json({
                status: "success",
                data: story
            });

        } catch (error) {
            console.error("Error fetching story detail:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);


// Delete story with media deactivation
/**
 * @swagger
 * /v1/user/story/story/{story_id}/with_media/:
 *   delete:
 *     summary: حذف استوری همراه با غیرفعال کردن مدیاهای مرتبط
 *     description: |
 *       این endpoint برای حذف نرم استوری و غیرفعال کردن تمام مدیاهای مرتبط با آن استفاده می‌شود.
 *       فقط کاربر ایجادکننده استوری می‌تواند آن را حذف کند.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه استوری
 *     responses:
 *       200:
 *         description: استوری و مدیاهای مرتبط با موفقیت حذف شدند
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Story and related media deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     story_id:
 *                       type: integer
 *                       example: 1
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک استوری نیست
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
 *                   example: "You don't have permission to delete this story"
 *       404:
 *         description: استوری یافت نشد
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
 *                   example: "Story not found"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.delete(
    "/story/:story_id/with_media/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const storyId = parseInt(req.params.story_id);
            const userId = (req as any).user.user_id;

            // check storyId
            if (isNaN(storyId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid story ID"
                });
            }

            const storyRepository = AppDataSource.getRepository(Story);
            const mediaRepository = AppDataSource.getRepository(StoryMedia);
            
            // find story 
            const story = await storyRepository.findOne({
                where: { 
                    id: storyId,
                    is_active: true,
                    user: {id: userId}
                },
            });

            if (!story) {
                return res.status(404).json({
                    status: false,
                    message: "Story not found"
                });
            }

            // delete story
            story.is_active = false;
            await storyRepository.save(story);

            return res.status(200).json({
                status: "success",
                message: "Story and related media deleted successfully",
                data: {
                    story_id: story.id,
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// Get all stories with pagination (آپدیت شده)
/**
 * @swagger
 * /v1/user/story/all_user_story/:
 *   get:
 *     summary: دریافت لیست استوری‌های کاربران با مدیاها
 *     description: |
 *       این endpoint برای دریافت لیست استوری‌های فعال کاربران در ۲۴ ساعت گذشته به همراه مدیاهای آنها استفاده می‌شود.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه برای صفحه‌بندی
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه (حداکثر 50)
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست استوری‌ها با موفقیت بازگردانده شد
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
 *                     $ref: '#/components/schemas/StoryWithMedia'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     total_pages:
 *                       type: integer
 *                       example: 5
 *                     total_items:
 *                       type: integer
 *                       example: 95
 *                     items_per_page:
 *                       type: integer
 *                       example: 20
 *                     has_next:
 *                       type: boolean
 *                       example: true
 *                     has_previous:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.get(
    "/all_user_story/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * limit;
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const storyRepository = AppDataSource.getRepository(Story);
            const [stories, totalCount] = await storyRepository.findAndCount({
                where: { 
                    is_active: true, 
                    createdAt: MoreThan(twentyFourHoursAgo) 
                },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    caption: true,
                    media: true,
                    view_count: true,
                    user: {
                        id: true,
                        username: true,
                        profile: {
                            id: true,
                            profile_image: {
                                id: true,
                                image_path: true
                            }
                        }
                    }
                },
                relations: [
                    "media",
                    "user", 
                    "user.profile", 
                    "user.profile.profile_image"
                ],
                take: limit,
                skip: skip
            });

            const totalPages = Math.ceil(totalCount / limit);

            return res.status(200).json({
                status: "success",
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: totalCount,
                    items_per_page: limit,
                    has_next: page < totalPages,
                    has_previous: page > 1
                },
                data:stories,
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error",
                error: error
            });
        }
    }
);


// Create media
/**
 * @swagger
 * /v1/user/story/create_media/:
 *   post:
 *     summary: آپلود مدیا برای استوری
 *     description: |
 *       این endpoint برای آپلود فایل‌های ویدیویی و تصویری برای استوری استفاده می‌شود.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: فایل ویدیو یا تصویر
 *     responses:
 *       201:
 *         description: مدیا با موفقیت آپلود شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Media created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/StoryMedia'
 *       400:
 *         description: درخواست نامعتبر
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
 *                   example: "request body is required"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.post(
    "/create_media/",
    authenticateJWT,
    videoUploaded.single("file"),
    async (req: Request, res: Response) => {
        try {
            // check request body
            if (!req.body || !req.file) {
                return res.status(400).json({
                    status: false,
                    message: "request body is required"
                });
            }

            // read file
            const fileContent = fs.readFileSync(req.file.path);
            const userId = (req as any).user.user_id;
            
            // calc duration video
            let videoDuration = 0;
            if (req.file.mimetype.startsWith('video/')) {
                videoDuration = await getVideoDurationInSeconds(req.file.path);
            }

            const params: PutObjectCommandInput = {
                ACL: "public-read",
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `uploads/${userId}/${req.file.filename}.${req.file.mimetype.split('/')[1]}`,
                Body: fileContent,
                ContentType: req.file.mimetype
            };

            // upload in s3
            const command = new PutObjectCommand(params);
            await s3ClientConfig.send(command);

            // remove file in memory
            fs.unlinkSync(req.file.path);

            // save in database
            const file = req.file;
            const mediaRepository = AppDataSource.getRepository(StoryMedia);
            const newStoryMedia = new StoryMedia();
            newStoryMedia.file_path = `https://${process.env.AWS_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${params.Key}`;
            newStoryMedia.mime_type = file.mimetype;
            newStoryMedia.size = file.size;
            newStoryMedia.user = { id: userId } as User;
            newStoryMedia.duration = videoDuration; // مقدار عددی
            newStoryMedia.media_type = file.mimetype.split("/")[0] === "image" ? MediaTypeEnum.IMAGE : MediaTypeEnum.VIDEO;

            // save in database
            await mediaRepository.save(newStoryMedia);

            return res.status(201).json({
                status: "success",
                message: "Media created successfully",
                data: newStoryMedia
            });

        } catch (error) {
            console.error("Error creating media:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);


// Get user media with pagination
/**
 * @swagger
 * /v1/user/story/my_media/:
 *   get:
 *     summary: دریافت لیست مدیاهای آپلود شده توسط کاربر
 *     description: |
 *       این endpoint برای دریافت لیست مدیاهای آپلود شده توسط کاربر جاری استفاده می‌شود.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه برای صفحه‌بندی
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه (حداکثر 50)
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست مدیاها با موفقیت بازگردانده شد
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
 *                     $ref: '#/components/schemas/StoryMedia'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     total_pages:
 *                       type: integer
 *                       example: 5
 *                     total_items:
 *                       type: integer
 *                       example: 95
 *                     items_per_page:
 *                       type: integer
 *                       example: 20
 *                     has_next:
 *                       type: boolean
 *                       example: true
 *                     has_previous:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.get(
    "/my_media/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            // const page = Number(req.query.page) || 1;
            // const limit = Number(req.query.limit) || 20;
            // const skip = (page - 1) * limit;

            const mediaRepository = AppDataSource.getRepository(StoryMedia);
            
            const [mediaList, totalCount] = await mediaRepository.findAndCount({
                where: {
                    user: { id: userId },
                    is_active: true
                },
                select: {
                    id: true,
                    file_path: true,
                    mime_type: true,
                    size: true,
                    duration: true,
                    media_type: true,
                    createdAt: true
                },
                order: {
                    createdAt: "DESC"
                },
                // take: limit,
                // skip: skip
            });

            // const totalPages = Math.ceil(totalCount / limit);

            return res.status(200).json({
                status: "success",
                data: mediaList,
                // pagination: {
                //     current_page: page,
                //     total_pages: totalPages,
                //     total_items: totalCount,
                //     items_per_page: limit,
                //     has_next: page < totalPages,
                //     has_previous: page > 1
                // }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error",
                error: error.message,
                userId: (req as any).user?.user_id,
                query: req.query,
                stack: error.stack
            });
        }
    }
);


// Delete media
/**
 * @swagger
 * /v1/user/story/media/{media_id}:
 *   delete:
 *     summary: حذف مدیا
 *     description: |
 *       این endpoint برای حذف مدیا توسط کاربر ایجادکننده آن استفاده می‌شود.
 *       نیاز به احراز هویت دارد.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: media_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه مدیا
 *     responses:
 *       200:
 *         description: مدیا با موفقیت حذف شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Media deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     file_path:
 *                       type: string
 *                       example: "https://example.com/uploads/image.jpg"
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک مدیا نیست
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
 *                   example: "You don't have permission to delete this media"
 *       404:
 *         description: مدیا یافت نشد
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
 *                   example: "Media not found"
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.delete(
    "/media/:media_id/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const mediaId = parseInt(req.params.media_id);

            // Check if media exists and user has permission
            const mediaRepository = AppDataSource.getRepository(StoryMedia);
            const media = await mediaRepository.findOne({
                where: {
                    id: mediaId,
                    user: { id: userId },
                    is_active: true
                },
                relations: ["user"]
            });

            if (!media) {
                return res.status(404).json({
                    status: false,
                    message: "Media not found or you don't have permission to delete it"
                });
            }

            // Soft delete the media (set is_active to false)
            media.is_active = false;
            await mediaRepository.save(media);

            return res.status(200).json({
                status: "success",
                message: "Media deleted successfully",
                data: {
                    id: media.id,
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);