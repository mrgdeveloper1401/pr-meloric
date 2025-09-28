import express from "express";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Story } from "../../../../entity/Story";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { MoreThan } from "typeorm";
import { plainToClass } from "class-transformer";
import { CreateStoryDto } from "../../../../dtos/music/CreateStory";
import { validate } from "class-validator";
import { User } from "../../../../entity/User";
import { s3ClientConfig, videoUploaded } from "../../../../utils/amazon_s3/S3Config";
import fs from "fs";
import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { MediaTypeEnum, StoryMedia } from "../../../../entity/StoryMedia";
import dotenv from "dotenv"
import { getVideoDurationInSeconds } from 'get-video-duration';

export const storyRouter = express.Router();
dotenv.config()


// get all story
/**
 * @swagger
 * /v1/user/story/all_user_story/:
 *   get:
 *     summary: دریافت لیست استوری‌های کاربران
 *     description: |
 *       این endpoint برای دریافت لیست استوری‌های فعال کاربران در ۲۴ ساعت گذشته استفاده می‌شود.
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
 *               $ref: '#/components/schemas/StoryListResponse'
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
            const userStoryRepository = AppDataSource.getRepository(Story);
            const [stories, count] = await userStoryRepository.findAndCount(
                {
                    where: { is_active: true, createdAt: MoreThan(twentyFourHoursAgo) },
                    relations: ['user', "user.profile", "user.profile.profile_image"],
                    select: {
                        id: true,
                        caption: true,
                        createdAt: true,
                        user: {
                            id: true,
                            username: true,
                            profile: {
                                id: true,
                                profile_image: {
                                    image_path: true
                                }
                            }
                        },
                    },
                    order: {
                        createdAt: "DESC"
                    },
                    take: limit,
                    skip: skip
                },
            )

            return res.status(200).json(
                {
                    status: "success",
                    data: stories,
                    count: count,
                    limit: limit,
                    page: page
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    message: "server error",
                    status: false
                }
            )
        }
    }
)

// create story
/**
 * @swagger
 * /v1/user/story/create_story:
 *   post:
 *     summary: ایجاد استوری جدید
 *     description: |
 *       این endpoint برای ایجاد یک استوری جدید با استفاده از تصویر آپلود شده استفاده می‌شود.
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
 *             properties:
 *               caption:
 *                 type: string
 *                 description: توضیحات اختیاری استوری
 *                 example: "این یک استوری تست است!"
 *                 nullable: true
 *     responses:
 *       201:
 *         description: استوری با موفقیت ایجاد شد
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
 *                   example: "successfully create story"
 *                 data:
 *                   type: object
 *                   properties:
 *                     caption:
 *                       type: string
 *                       nullable: true
 *                       example: "این یک استوری تست است!"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-17T01:07:00.000Z"
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *               examples:
 *                 missingBody:
 *                   value:
 *                     status: false
 *                     message: "request body is required"
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
    "/create_story/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // check request body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "request body is required",
                });
            }

            // validate dto
            const StoryDto = plainToClass(CreateStoryDto, req.body);
            const errors = await validate(StoryDto);
            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid Data",
                    errors: errors.map(err => ({
                        field: err.property,
                        value: err.constraints,
                    })),
                });
            }

            // create story
            const storyRepository = AppDataSource.getRepository(Story);
            const createStory = new Story();
            createStory.caption = StoryDto.caption;
            createStory.user = { id: (req as any).user.user_id } as User;
            createStory.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await storyRepository.save(createStory);

            // response
            return res.status(201).json({
                status: "success",
                message: "successfully create story",
                data: {
                    caption: createStory.caption,
                    created_at: createStory.createdAt,
                },
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error",
            });
        }
    }
);

// delete story
/**
 * @swagger
 * /v1/user/story/{story_id}:
 *   delete:
 *     summary: حذف استوری
 *     description: |
 *       این endpoint برای حذف استوری توسط کاربر ایجادکننده آن استفاده می‌شود.
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
 *         description: استوری با موفقیت حذف شد
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
 *                   example: "Story deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     caption:
 *                       type: string
 *                       example: "My story caption"
 *                     is_active:
 *                       type: boolean
 *                       example: false
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
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.delete(
    "/:story_id/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const storyId = parseInt(req.params.story_id);

            // Check if story exists and user has permission
            const storyRepository = AppDataSource.getRepository(Story);
            const story = await storyRepository.findOne({
                where: {
                    is_active: true,
                    id: storyId,
                    user: {
                        id: userId
                    }
                },
                relations: ["user"]
            });

            if (!story) {
                return res.status(404).json({
                    status: false,
                    message: "Story not found or you don't have permission to delete it"
                });
            }

            // Soft delete the story (set is_active to false)
            story.is_active = false;
            await storyRepository.save(story);

            return res.status(200).json({
                status: "success",
                message: "Story deleted successfully"
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
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