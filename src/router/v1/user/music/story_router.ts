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
            const foundMediaIds = checkStoryMedia.map(media => media.id);
            const missingMediaIds = createStoryDto.media_ids.filter(id => !foundMediaIds.includes(id));
            if (missingMediaIds.length > 0) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "Some media files not found",
                        missing_media_ids: missingMediaIds,
                        found_media_ids: foundMediaIds
                    }
                )
            }
            // create story
            const storyRepository = AppDataSource.getRepository(Story);
            const newStory = new Story();
            newStory.caption = createStoryDto.caption;
            newStory.user = {id: userId} as User;
            newStory.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
            // newStory.view_count = 0;
            newStory.is_active = true;

            // save story
            await storyRepository.save(newStory);

            // update media
            const updatePromises = checkStoryMedia.map(
                async (media) => {
                    media.story = newStory;
                    await storyMediaRepository.save(media);
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
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            const story = await storyRepository.findOne({
                where: { 
                    id: storyId,
                    is_active: true,
                    createdAt: MoreThan(twentyFourHoursAgo),
                    media: {
                        is_active: true
                    }
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
                    // view_count: true,
                    media: {
                        id: true,
                        file_path: true,
                        media_type: true
                    },
                    user: {
                        id: true,
                        username: true,
                        profile_image: {
                            id: true,
                            image_path: true
                        },
                        profile: {
                            id: true,
                            // profile_image: {
                                // id: true,
                                // image_path: true
                            // }
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

            // incress view count
            // story.view_count += 1;
            // await storyRepository.save(story);

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


// Delete story 
/**
 * @swagger
 * /v1/user/story/story/{story_id}/:
 *   delete:
 *     summary: حذف استوری 
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
    "/story/:story_id/",
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


// Get all stories with pagination
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
// در endpoint اصلی خود این تغییرات را اعمال کنید:

storyRouter.get(
    "/all_user_story/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * limit;

            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

            // ابتدا کاربران منحصر به فرد را پیدا کنید
            const usersWithStories = await AppDataSource.getRepository(Story)
                .createQueryBuilder("story")
                .leftJoinAndSelect("story.user", "user")
                .leftJoinAndSelect("user.user_artist_set", "artist")
                .leftJoinAndSelect("user.profile_image", "profile_image")
                .where("story.is_active = :isActive AND story.expires_at > :expiredAt", {
                    isActive: true, 
                    expiredAt: twentyFourHoursAgo
                })
                .select([
                    "user.id",
                    "user.is_artist",
                    "user.username",
                    "artist.id",
                    "user.first_name",
                    "user.last_name",
                    "profile_image.image_path",
                    "profile_image.id",
                    "COUNT(story.id) as story_count" // تعداد استوری‌های کاربر
                ])
                .groupBy("user.id, artist.id, profile_image.id")
                .orderBy("MAX(story.createdAt)", "DESC") // بر اساس آخرین استوری مرتب‌سازی
                .skip(skip)
                .take(limit)
                .getRawMany();

            // حالا برای هر کاربر، تمام مدیاها را بگیرید
            const simpleData = await Promise.all(
                usersWithStories.map(async (userRow) => {
                    // تمام مدیاهای کاربر در ۲۴ ساعت گذشته
                    const userStories = await AppDataSource.getRepository(Story)
                        .createQueryBuilder("story")
                        .leftJoinAndSelect("story.media", "media")
                        .where("story.user_id = :userId", { userId: userRow.user_id })
                        .andWhere("story.is_active = :isActive AND story.expires_at > :expiredAt", {
                            isActive: true,
                            expiredAt: twentyFourHoursAgo
                        })
                        .orderBy("story.createdAt", "DESC")
                        .getMany();

                    // ادغام تمام مدیاهای کاربر
                    const allMedia = userStories.flatMap(story => 
                        story.media?.map(media => ({
                            id: media.id,
                            file_path: media.file_path,
                            media_type: media.media_type,
                            mime_type: media.mime_type,
                            story_id: story.id,
                            created_at: story.createdAt
                        })) || []
                    );

                    return {
                        id: userRow.user_id, // یا می‌توانید از story id اول استفاده کنید
                        user_id: userRow.user_id,
                        username: userRow.user_username,
                        artist_id: userRow.artist_id || null,
                        is_artist: userRow.user_is_artist,
                        created_at: userStories[0]?.createdAt, // تاریخ اولین استوری
                        profile_image: userRow.profile_image_image_path || null,
                        profile_image_id: userRow.profile_image_id || null,
                        story_media: allMedia,
                        stories_count: userStories.length // تعداد کل استوری‌های کاربر
                    };
                })
            );

            // برای pagination نیاز داریم کل کاربران را بشماریم
            const totalUsersCount = await AppDataSource.getRepository(Story)
                .createQueryBuilder("story")
                .leftJoin("story.user", "user")
                .where("story.is_active = :isActive AND story.expires_at > :expiredAt", {
                    isActive: true,
                    expiredAt: twentyFourHoursAgo
                })
                .select("COUNT(DISTINCT user.id)", "count")
                .getRawOne();

            const totalCount = parseInt(totalUsersCount.count) || 0;
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
                data: simpleData,
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error",
                error: error.message
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

// append media into story
/**
 * @swagger
 * /v1/user/story/story/{story_id}/add_media/:
 *   post:
 *     summary: اضافه کردن مدیا به استوری موجود
 *     description: |
 *       این endpoint برای اضافه کردن مدیاهای جدید به یک استوری موجود استفاده می‌شود.
 *       نیاز به احراز هویت دارد و کاربر فقط می‌تواند به استوری‌های خودش مدیا اضافه کند.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه استوری
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - media_ids
 *             properties:
 *               media_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: آرایه‌ای از شناسه‌های مدیاهای آپلود شده
 *                 example: [5, 6, 7]
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: مدیاها با موفقیت به استوری اضافه شدند
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
 *                   example: "Media added to story successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     story_id:
 *                       type: integer
 *                       example: 1
 *                     added_media_ids:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [5, 6, 7]
 *                     total_media_count:
 *                       type: integer
 *                       example: 7
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
 *                   example: "Invalid request data"
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
 *                   example: "You don't have permission to modify this story"
 *       404:
 *         description: استوری یا مدیا یافت نشد
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
 *                   example: "Story or media not found"
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.post(
    "/story/:story_id/add_media/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const storyId = Number(req.params.story_id);
            const { media_ids } = req.body;

            // check story id
            if (isNaN(storyId) || storyId <= 0) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid story ID"
                });
            }

            // check request body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "request body is required"
                });
            }

            // check media_ids
            if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "media_ids must be a non-empty array"
                });
            }

            // check story
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); 
            const storyRepository = AppDataSource.getRepository(Story);
            const story = await storyRepository.findOne({
                where: {
                    id: storyId,
                    user: { id: userId },
                    expires_at: MoreThan(twentyFourHoursAgo),
                    is_active: true
                },
                select: ['id']
            });

            if (!story) {
                return res.status(404).json({
                    status: false,
                    message: "Story not found or you don't have permission"
                });
            }

            // بررسی مدیاها
            const storyMediaRepository = AppDataSource.getRepository(StoryMedia);
            const existingMedia = await storyMediaRepository.find({
                where: {
                    id: In(media_ids),
                    is_active: true,
                    user: { id: userId },
                },
                select: ['id']
            });

            const foundMediaIds = existingMedia.map(media => media.id);
            const missingMediaIds = media_ids.filter(id => !foundMediaIds.includes(id));

            if (missingMediaIds.length > 0) {
                return res.status(404).json({
                    status: false,
                    message: "Some media files not found or already assigned to another story",
                    missing_media_ids: missingMediaIds
                });
            }

            // append media into story
            const updatePromises = existingMedia.map(async (media) => {
                media.story = story;
                await storyMediaRepository.save(media);
            });

            await Promise.all(updatePromises);

            // count all media
            const totalMediaCount = await storyMediaRepository.count({
                where: {
                    story: { id: storyId },
                    is_active: true
                }
            });

            return res.status(200).json({
                status: "success",
                message: "Media added to story successfully",
                data: {
                    story_id: storyId,
                    added_media_ids: foundMediaIds,
                    total_media_count: totalMediaCount
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

/**
 * @swagger
 * /v1/user/story/story/{story_id}/remove_media/:
 *   delete:
 *     summary: حذف مدیا از استوری
 *     description: |
 *       این endpoint برای حذف مدیاها از یک استوری موجود استفاده می‌شود.
 *       نیاز به احراز هویت دارد و کاربر فقط می‌تواند از استوری‌های خودش مدیا حذف کند.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: story_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه استوری
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - media_ids
 *             properties:
 *               media_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: آرایه‌ای از شناسه‌های مدیاها برای حذف از استوری
 *                 example: [2, 3]
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: مدیاها با موفقیت از استوری حذف شدند
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
 *                   example: "Media removed from story successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     story_id:
 *                       type: integer
 *                       example: 1
 *                     removed_media_ids:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [2, 3]
 *                     remaining_media_count:
 *                       type: integer
 *                       example: 5
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
 *                   example: "Invalid request data"
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
 *                   example: "You don't have permission to modify this story"
 *       404:
 *         description: استوری یا مدیا یافت نشد
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
 *                   example: "Story or media not found"
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerError'
 */
storyRouter.delete(
    "/story/:story_id/remove_media/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const storyId = Number(req.params.story_id);
            const { media_ids } = req.body;

            // story
            if (isNaN(storyId) || storyId <= 0) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid story ID"
                });
            }

            //  request body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "request body is required"
                });
            }

            //  media_ids
            if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
                return res.status(400).json({
                    status: false,
                    message: "media_ids must be a non-empty array"
                });
            }

            // check story
            const storyRepository = AppDataSource.getRepository(Story);
            const story = await storyRepository.findOne({
                where: {
                    id: storyId,
                    user: { id: userId },
                    is_active: true
                },
                select: ['id']
            });

            if (!story) {
                return res.status(404).json({
                    status: false,
                    message: "Story not found or you don't have permission"
                });
            }

            // check media in story
            const storyMediaRepository = AppDataSource.getRepository(StoryMedia);
            const existingMedia = await storyMediaRepository.find({
                where: {
                    id: In(media_ids),
                    is_active: true,
                    user: { id: userId },
                    story: { id: storyId }
                },
                select: ['id']
            });

            const foundMediaIds = existingMedia.map(media => media.id);
            const missingMediaIds = media_ids.filter(id => !foundMediaIds.includes(id));

            if (missingMediaIds.length > 0) {
                return res.status(404).json({
                    status: false,
                    message: "Some media files not found in this story",
                    missing_media_ids: missingMediaIds
                });
            }

            // remove media in story
            const updatePromises = existingMedia.map(async (media) => {
                media.story = null;
                await storyMediaRepository.save(media);
            });

            await Promise.all(updatePromises);

            // count other media
            const remainingMediaCount = await storyMediaRepository.count({
                where: {
                    story: { id: storyId },
                    is_active: true
                }
            });

            return res.status(200).json({
                status: "success",
                message: "Media removed from story successfully",
                data: {
                    story_id: storyId,
                    removed_media_ids: foundMediaIds,
                    remaining_media_count: remainingMediaCount
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

// getmy story
/**
 * @swagger
 * /v1/user/story/my_story/:
 *   get:
 *     summary: دریافت استوری‌های کاربر جاری
 *     description: |
 *       این endpoint برای دریافت لیست استوری‌های کاربر جاری با قابلیت صفحه‌بندی استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد و فقط استوری‌های فعال کاربر را بازمی‌گرداند.
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
 *         description: شماره صفحه (پیش‌فرض 1)
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
 *         description: لیست استوری‌های کاربر با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StoryWithMedia'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   pagination:
 *                     current_page: 1
 *                     total_pages: 3
 *                     total_items: 45
 *                     items_per_page: 20
 *                     has_next: true
 *                     has_previous: false
 *                   data:
 *                     - id: 1
 *                       caption: "استوری اول من"
 *                       view_count: 150
 *                       created_at: "2024-01-15T10:30:00.000Z"
 *                       updated_at: "2024-01-15T10:30:00.000Z"
 *                       expires_at: "2024-01-16T10:30:00.000Z"
 *                       media:
 *                         - id: 1
 *                           file_path: "https://example.com/story1/image1.jpg"
 *                           media_type: "image"
 *                         - id: 2
 *                           file_path: "https://example.com/story1/video1.mp4"
 *                           media_type: "video"
 *                       user:
 *                         id: 123
 *                         username: "user123"
 *                         profile:
 *                           id: 1
 *                           profile_image:
 *                             id: 1
 *                             image_path: "https://example.com/profiles/user123.jpg"
 *                     - id: 2
 *                       caption: "استوری دوم من"
 *                       view_count: 89
 *                       created_at: "2024-01-14T15:45:00.000Z"
 *                       updated_at: "2024-01-14T15:45:00.000Z"
 *                       expires_at: "2024-01-15T15:45:00.000Z"
 *                       media:
 *                         - id: 3
 *                           file_path: "https://example.com/story2/image2.jpg"
 *                           media_type: "image"
 *                       user:
 *                         id: 123
 *                         username: "user123"
 *                         profile:
 *                           id: 1
 *                           profile_image:
 *                             id: 1
 *                             image_path: "https://example.com/profiles/user123.jpg"
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
    "/my_story/",
    authenticateJWT,
    async(req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const limit = Number(req.query.limit) || 20;
            const page = Number(req.query.page) || 1;
            const skip = (page - 1) * limit;

            const storyRepository = AppDataSource.getRepository(Story);
            const [myStory, total] = await storyRepository.findAndCount(
                {
                    where: {
                        is_active: true,
                        user: {id: userId}
                    },
                    skip: skip,
                    take: limit,
                    select: {
                        id: true,
                        createdAt: true,
                        updatedAt: true,
                        caption: true,
                        expires_at: true,
                        // view_count: true,
                        media: {
                            id: true,
                            file_path: true,
                            media_type: true
                        },
                        user: {
                            id: true,
                            username: true,
                            profile_image: {
                                id: true,
                                image_path: true
                            },
                            profile: {
                                id: true,
                                // profile_image: {
                                //     id: true,
                                //     image_path: true
                                // }
                            }
                        }
                    },
                    relations: {
                        media: true,
                        user: {
                            profile_image: true,
                            profile: true
                        }
                    },
                    order: {
                        createdAt: "DESC"
                    }
                }
            );

            // محاسبه تعداد صفحات
            const totalPages = Math.ceil(total / limit);
            
            return res.status(200).json({
                status: "success",
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_items: total,
                    items_per_page: limit,
                    has_next: page < totalPages,
                    has_previous: page > 1
                },
                data: myStory,
            });
        } catch (error) {
            console.error("Get my stories error:", error);
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);