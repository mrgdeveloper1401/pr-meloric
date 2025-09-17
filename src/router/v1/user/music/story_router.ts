import express from "express";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Story } from "../../../../entity/Story";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { MoreThan } from "typeorm";
import { Image } from "../../../../entity/Image";
import { plainToClass } from "class-transformer";
import { CreateStoryDto } from "../../../../dtos/music/CreateStory";
import { validate } from "class-validator";
import { User } from "../../../../entity/User";


export const storyRouter = express.Router();

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
                    where: {is_active: true, createdAt: MoreThan(twentyFourHoursAgo)},
                    relations: ['user', "user.profile", "user.profile.profile_image", "image_story"],
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
                        image_story: {
                            id: true,
                            image_path: true
                        }
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
 *             required:
 *               - image_id
 *             properties:
 *               image_id:
 *                 type: integer
 *                 description: شناسه تصویر آپلود شده
 *                 example: 1
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
 *                   example: "successfully create image story"
 *                 data:
 *                   type: object
 *                   properties:
 *                     caption:
 *                       type: string
 *                       nullable: true
 *                       example: "این یک استوری تست است!"
 *                     image_path:
 *                       type: string
 *                       example: "/path/to/story.jpg"
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
 *                 invalidData:
 *                   value:
 *                     status: false
 *                     message: "Invalid Data"
 *                     errors:
 *                       - field: "image_id"
 *                         value: { isNumber: "image_id must be a number" }
 *       404:
 *         description: تصویر یافت نشد
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
 *                   example: "image not found"
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
            const imageStoryDto = plainToClass(CreateStoryDto, req.body);
            const errors = await validate(imageStoryDto);
            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid Data",
                    errors: errors.map((err) => ({
                        field: err.property,
                        value: err.constraints,
                    })),
                });
            }

            // check image
            const imageStoryRepository = AppDataSource.getRepository(Image);
            const checkImageUserUpload = await imageStoryRepository.findOne({
                where: {is_active: true ,id: imageStoryDto.image_id, user: { id: (req as any).user.user_id } },
                select: {
                    id: true,
                    image_path: true,
                },
            });

            if (!checkImageUserUpload) {
                return res.status(404).json({
                    status: false,
                    message: "image not found",
                });
            }

            // create story
            const storyRepository = AppDataSource.getRepository(Story);
            const createStoryImage = new Story();
            createStoryImage.caption = imageStoryDto.caption;
            createStoryImage.image_story = checkImageUserUpload;
            createStoryImage.user = { id: (req as any).user.user_id } as User;
            await storyRepository.save(createStoryImage);

            // response
            return res.status(201).json({
                status: "success",
                message: "successfully create image story",
                data: {
                    caption: createStoryImage.caption,
                    image_path: checkImageUserUpload.image_path,
                    created_at: createStoryImage.createdAt,
                },
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error",
                error: error.message || error,
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
 *       400:
 *         description: استوری قبلاً حذف شده است
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
 *                   example: "Story is already deleted"
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
        relations: ["user", "image_story"]
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
        message: "Story deleted successfully",
        data: {
          id: story.id,
          caption: story.caption,
          is_active: story.is_active
        }
      });

    } catch (error) {
      console.error("Delete story error:", error);
      return res.status(500).json({
        status: false,
        message: "server error"
      });
    }
  }
);
