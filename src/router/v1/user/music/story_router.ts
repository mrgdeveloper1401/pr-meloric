import express from "express";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Story } from "../../../../entity/Story";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { MoreThan } from "typeorm";
import { User } from "../../../../entity/User";
import { s3ClientConfig, videoUploaded } from "../../../../utils/amazon_s3/S3Config";
import fs from "fs";
import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { MediaTypeEnum, StoryMedia } from "../../../../entity/StoryMedia";
import dotenv from "dotenv"
import { getVideoDurationInSeconds } from 'get-video-duration';

export const storyRouter = express.Router();
dotenv.config()


// Create story with multiple media
/**
 * @swagger
 * /v1/user/story/create_story_with_media/:
 *   post:
 *     summary: ایجاد استوری جدید با چندین مدیا
 *     description: |
 *       این endpoint برای ایجاد یک استوری جدید همراه با چندین فایل مدیا استفاده می‌شود.
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
 *               caption:
 *                 type: string
 *                 description: توضیحات اختیاری استوری
 *                 example: "این یک استوری تست است!"
 *                 nullable: true
 *               media_files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: آرایه‌ای از فایل‌های مدیا (تصاویر یا ویدیوها)
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
 *       $ref: '#/components/schemas/StoryWithMedia'
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
 *                   example: "Media files are required"
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
    "/create_story_with_media/",
    authenticateJWT,
    videoUploaded.array("media_files", 10), // حداکثر 10 فایل
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            
            if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "At least one media file is required"
                });
            }

            const files = req.files as Express.Multer.File[];
            const { caption } = req.body;

            // ایجاد استوری
            const storyRepository = AppDataSource.getRepository(Story);
            const mediaRepository = AppDataSource.getRepository(StoryMedia);

            const newStory = new Story();
            newStory.caption = caption;
            newStory.user = { id: userId } as User;
            newStory.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await storyRepository.save(newStory);

            // آپلود و ایجاد مدیاها
            const mediaPromises = files.map(async (file) => {
                const fileContent = fs.readFileSync(file.path);
                
                // محاسبه مدت زمان ویدیو
                let videoDuration = 0;
                if (file.mimetype.startsWith('video/')) {
                    videoDuration = await getVideoDurationInSeconds(file.path);
                }

                // آپلود به S3
                const params: PutObjectCommandInput = {
                    ACL: "public-read",
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `uploads/${userId}/stories/${newStory.id}/${file.filename}.${file.mimetype.split('/')[1]}`,
                    Body: fileContent,
                    ContentType: file.mimetype
                };

                const command = new PutObjectCommand(params);
                await s3ClientConfig.send(command);

                // ایجاد مدیا
                const newMedia = new StoryMedia();
                newMedia.file_path = `https://${process.env.AWS_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${params.Key}`;
                newMedia.mime_type = file.mimetype;
                newMedia.size = file.size;
                newMedia.user = { id: userId } as User;
                newMedia.story = newStory;
                newMedia.duration = videoDuration;
                newMedia.media_type = file.mimetype.split("/")[0] === "image" ? MediaTypeEnum.IMAGE : MediaTypeEnum.VIDEO;

                // حذف فایل موقت
                fs.unlinkSync(file.path);

                return await mediaRepository.save(newMedia);
            });

            const savedMedia = await Promise.all(mediaPromises);

            // لود کردن استوری با مدیاها
            const storyWithMedia = await storyRepository.findOne({
                where: { id: newStory.id },
                relations: ["media", "user", "user.profile"]
            });

            return res.status(201).json({
                status: "success",
                message: "Story with media created successfully",
                data: storyWithMedia
            });

        } catch (error) {
            console.error("Error creating story with media:", error);
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
 * /v1/user/story/{story_id}/:
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
                ]
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
            // const limit = parseInt(req.query.limit as string) || 20;
            // const page = parseInt(req.query.page as string) || 1;
            // const skip = (page - 1) * limit;
            // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            // const storyRepository = AppDataSource.getRepository(Story);
            // const [stories, totalCount] = await storyRepository.findAndCount({
            //     where: { 
            //         is_active: true, 
            //         createdAt: MoreThan(twentyFourHoursAgo) 
            //     },
            //     select: {
            //         id: true,
            //         caption: true
            //     },
                // relations: [
                //     "media",
                //     "user", 
                //     "user.profile", 
                //     "user.profile.profile_image"
                // ],
                // take: limit,
                // skip: skip
            // });

            // const totalPages = Math.ceil(totalCount / limit);

            return res.status(200).json({
                status: "success",
                daya: "ok",
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