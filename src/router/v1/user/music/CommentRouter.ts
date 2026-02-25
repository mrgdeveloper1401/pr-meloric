// src/router/v1/user/music/CommentRouter.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Comment, CommentReport } from "../../../../entity/Comment";
import { User } from "../../../../entity/User";
import { Song } from "../../../../entity/Song";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { plainToClass } from "class-transformer";
import {
  CreateCommentDTO,
  UpdateCommentIsReport,
} from "../../../../dtos/music/CommentDto";
import { validate } from "class-validator";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: مدیریت نظرات آهنگ‌ها
 */

/**
 *
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: شناسه نظر
 *         body:
 *           type: string
 *           description: متن نظر
 *         is_active:
 *           type: boolean
 *           description: وضعیت فعال بودن نظر
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ ایجاد
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ به‌روزرسانی
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *         song:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 *
 *     CreateCommentRequest:
 *       type: object
 *       required:
 *         - song_id
 *         - body
 *       properties:
 *         song_id:
 *           type: integer
 *           description: شناسه آهنگ
 *         body:
 *           type: string
 *           description: متن نظر
 *
 *     UpdateCommentRequest:
 *       type: object
 *       properties:
 *         body:
 *           type: string
 *           description: متن نظر
 *         is_active:
 *           type: boolean
 *           description: وضعیت فعال بودن نظر
 */

// create comment
/**
 * @swagger
 * /v1/user/comment_music/comments:
 *   post:
 *     summary: ایجاد نظر جدید
 *     description: ایجاد یک نظر جدید برای آهنگ
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       201:
 *         description: نظر با موفقیت ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *       404:
 *         description: آهنگ پیدا نشد
 *       500:
 *         description: خطای سرور
 */
router.post(
  "/comments",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      // check get user
      const userId = (req as any).user.user_id;

      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const createCommentDto = plainToClass(CreateCommentDTO, req.body);
      const errors = await validate(createCommentDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          error: errors.map((error) => ({
            field: error.property,
            value: error.constraints,
          })),
        });
      }

      // check song dose exits
      const songRepository = AppDataSource.getRepository(Song);
      const getSong = await songRepository.findOne({
        where: { id: createCommentDto.song_id, is_active: true },
        select: { id: true },
      });
      if (!getSong) {
        return res.status(404).json({
          status: false,
          message: "song not found",
        });
      }

      // create comment
      const createComment = new Comment();
      createComment.body = createCommentDto.body;
      createComment.song = getSong;
      createComment.user = { id: userId } as User;
      await createComment.save();

      return res.status(201).json({
        status: "success",
        data: {
          id: createComment.id,
          body: createComment.body,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// read detail comment
/**
 * @swagger
 * /v1/user/comment_music/comments/{id}:
 *   get:
 *     summary: دریافت نظر خاص
 *     description: دریافت اطلاعات یک نظر خاص با نمایش پروفایل کاربر عادی یا آرتیست
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه نظر
 *     responses:
 *       200:
 *         description: اطلاعات نظر با پروفایل کاربر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: شناسه نظر
 *                     user_id:
 *                       type: integer
 *                       description: شناسه کاربر
 *                     username:
 *                       type: string
 *                       description: نام کاربری
 *                     profile_image:
 *                       type: string
 *                       nullable: true
 *                       description: آدرس تصویر پروفایل
 *                     song_id:
 *                       type: integer
 *                       description: شناسه آهنگ
 *                     body:
 *                       type: string
 *                       description: متن نظر
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: پارامتر ورودی نامعتبر
 *       404:
 *         description: نظر پیدا نشد
 *       500:
 *         description: خطای سرور
 */
router.get(
  "/comments/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      if (isNaN(Number(req.params.id))) {
        return res.status(400).json({
          status: false,
          message: "Comment ID must be a valid number",
        });
      }

      const commentId = Number(req.params.id);
      const commentRepository = AppDataSource.getRepository(Comment);

      const query = commentRepository
        .createQueryBuilder("comment")
        .leftJoinAndSelect("comment.user", "user")
        .leftJoinAndSelect("user.profile_image", "user_profile_image")
        .leftJoinAndSelect("user.user_artist_set", "artist")
        .leftJoinAndSelect("comment.song", "song")
        .where("comment.id = :commentId", { commentId })
        .andWhere("comment.is_active = :isActive", { isActive: true })
        .select([
          "comment.id",
          "comment.body",
          "comment.createdAt",
          "comment.updatedAt",
          "user.id",
          "user.username",
          "user.is_artist",
          "user.first_name",
          "user.last_name",
          "user_profile_image.id",
          "user_profile_image.image_path",
          "artist.id",
          "artist.nick_name",
          "song.id",
        ]);

      const comment = await query.getOne();

      if (!comment) {
        return res.status(404).json({
          status: false,
          message: "Comment not found",
        });
      }

      const simpleData = {
        id: comment.id,
        user_id: comment.user.id,
        username: comment.user.username,
        first_name: comment.user?.first_name || null,
        last_name: comment.user?.last_name || null,
        profile_image: comment.user.profile_image?.image_path || null,
        song_id: comment.song.id,
        body: comment.body,
        created_at: comment.createdAt,
        updated_at: comment.updatedAt,
      };

      res.json({
        status: "success",
        data: simpleData,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// read comment by song_id
/**
 * @swagger
 * /v1/user/comment_music/songs/{songId}/comments:
 *   get:
 *     summary: دریافت نظرات یک آهنگ
 *     description: دریافت لیست نظرات یک آهنگ خاص با صفحه‌بندی - نمایش پروفایل کاربر عادی یا آرتیست
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه آهنگ
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: تعداد آیتم در صفحه
 *     responses:
 *       200:
 *         description: لیست نظرات با اطلاعات پروفایل کاربر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه نظر
 *                       username:
 *                         type: string
 *                         description: نام کاربری
 *                       profile_image:
 *                         type: string
 *                         nullable: true
 *                         description: آدرس تصویر پروفایل
 *                       song_id:
 *                         type: integer
 *                         description: شناسه آهنگ
 *                       body:
 *                         type: string
 *                         description: متن نظر
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ ایجاد
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ بروزرسانی
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalItems:
 *                       type: integer
 *                       example: 100
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 20
 *       400:
 *         description: پارامترهای ورودی نامعتبر
 *       500:
 *         description: خطای سرور
 */
router.get(
  "/songs/:songId/comments",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const songId = parseInt(req.params.songId);
      if (isNaN(songId)) {
        return res.status(400).json({
          status: false,
          message: "songId must be a valid number",
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const commentRepository = AppDataSource.getRepository(Comment);

      const query = commentRepository
        .createQueryBuilder("comment")
        .leftJoinAndSelect("comment.user", "user")
        .leftJoinAndSelect("user.profile_image", "user_profile_image")
        .leftJoinAndSelect("comment.song", "song")
        .where("comment.song_id = :songId", { songId })
        .andWhere("comment.is_active = :isActive", { isActive: true })
        .andWhere("song.is_active = :isActive", { isActive: true })
        .select([
          "comment.id",
          "comment.body",
          "comment.createdAt",
          "comment.updatedAt",
          "user.id",
          "user.username",
          "user.is_artist",
          "user_profile_image.id",
          "user_profile_image.image_path",
          "song.id",
        ])
        .orderBy("comment.createdAt", "DESC")
        .skip(skip)
        .take(limit);

      const [comments, total] = await query.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      const simpleData = comments.map((item) => {
        return {
          id: item.id,
          username: item.user.username,
          profile_image: item.user.profile_image?.image_path || null,
          song_id: item.song.id,
          body: item.body,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        };
      });

      res.json({
        status: "success",
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
        },
        data: simpleData,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// update comment
/**
 * @swagger
 * /v1/user/comment_music/comments/{id}:
 *   put:
 *     summary: به‌روزرسانی نظر
 *     description: به‌روزرسانی یک نظر خاص (فقط مالک نظر می‌تواند ویرایش کند)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه نظر
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCommentRequest'
 *     responses:
 *       200:
 *         description: نظر با موفقیت به‌روزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Comment'
 *       403:
 *         description: عدم دسترسی - کاربر مالک نظر نیست
 *       404:
 *         description: نظر پیدا نشد
 *       500:
 *         description: خطای سرور
 */
router.put(
  "/comments/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const commentId = parseInt(req.params.id);
      const { body, is_active } = req.body;

      const commentRepository = AppDataSource.getRepository(Comment);

      const comment = await commentRepository.findOne({
        where: { id: commentId },
        relations: ["user"],
      });

      if (!comment) {
        return res.status(404).json({
          status: false,
          message: "Comment not found",
        });
      }

      // بررسی مالکیت نظر
      if (comment.user.id !== userId) {
        return res.status(403).json({
          status: false,
          message: "You are not the owner of this comment",
        });
      }

      // به‌روزرسانی فیلدها
      if (body !== undefined) comment.body = body;
      if (is_active !== undefined) comment.is_active = is_active;

      const updatedComment = await commentRepository.save(comment);

      // بازگرداندن داده با relations
      const commentWithRelations = await commentRepository.findOne({
        where: { id: updatedComment.id },
        relations: ["user", "song"],
        select: {
          user: { id: true, username: true },
          song: { id: true, title: true },
        },
      });

      res.json({
        status: "success",
        data: commentWithRelations,
      });
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }
);

// delete comment
/**
 * @swagger
 * /v1/user/comment_music/comments/{id}:
 *   delete:
 *     summary: حذف نظر
 *     description: حذف یک نظر خاص (فقط مالک نظر یا ادمین می‌تواند حذف کند)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه نظر
 *     responses:
 *       200:
 *         description: نظر با موفقیت حذف شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Comment deleted successfully
 *       403:
 *         description: عدم دسترسی
 *       404:
 *         description: نظر پیدا نشد
 *       500:
 *         description: خطای سرور
 */
router.delete(
  "/comments/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const commentId = parseInt(req.params.id);

      const commentRepository = AppDataSource.getRepository(Comment);
      const comment = await commentRepository.findOne({
        where: {
          id: commentId,
          is_active: true,
          user: {
            id: userId,
          },
        },
        relations: ["user"],
        select: {
          id: true,
          user: {
            id: true,
          },
        },
      });
      if (!comment) {
        return res.status(404).json({
          status: false,
          message: "Comment not found",
        });
      }

      // check owner comment
      if (comment.user.id !== userId) {
        return res.status(403).json({
          status: false,
          message: "You don't have permission to delete this comment",
        });
      }

      // (soft delete)
      comment.is_active = false;
      await commentRepository.save(comment);

      res.json({
        status: "success",
        message: "Comment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Server error",
      });
    }
  }
);

// report comment
/**
 * @swagger
 * /v1/user/comment_music/report_comment:
 *   post:
 *     summary: گزارش یک نظر
 *     description: |
 *       این endpoint برای گزارش یک نظر توسط کاربر استفاده می‌شود.
 *       هر کاربر فقط یک بار می‌تواند یک نظر خاص را گزارش کند.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment_id
 *               - is_report
 *             properties:
 *               comment_id:
 *                 type: integer
 *                 description: شناسه نظر مورد نظر برای گزارش
 *                 example: 42
 *               is_report:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: گزارش با موفقیت ثبت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: you successfully report comment 42
 *       400:
 *         description: خطای اعتبارسنجی یا گزارش تکراری
 *         content:
 *           application/json:
 *             oneOf:
 *               - schema:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         description: فیلد دارای خطا
 *                         example: comment_id
 *                       value:
 *                         type: object
 *                         description: محدودیت‌های نقض شده
 *                         example: { isNotEmpty: "comment_id should not be empty" }
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: you already report this comment
 *       401:
 *         description: نیاز به احراز هویت
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
 *                   example: Unauthorized
 *       404:
 *         description: نظر پیدا نشد
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
 *                   example: comment not found
 *       500:
 *         description: خطای سرور
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
 *                   example: server error
 *                 error:
 *                   type: string
 *                   example: "Cannot read property 'id' of undefined"
 */
router.post(
  "/report_comment/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      // validate request body
      const reportCommentDto = plainToClass(UpdateCommentIsReport, req.body);
      const errors = await validate(reportCommentDto);
      if (errors.length > 0) {
        return res.status(400).json(
          errors.map((i) => ({
            field: i.property,
            value: i.constraints,
          }))
        );
      }

      // check comment
      const userId = (req as any).user.user_id;
      const commentRepository = AppDataSource.getRepository(Comment);
      const checkComment = await commentRepository.findOne({
        where: {
          id: reportCommentDto.comment_id,
          is_active: true,
        },
        select: {
          id: true,
        },
      });
      if (!checkComment) {
        return res.status(404).json({
          status: false,
          message: "comment not found",
        });
      }

      // check report comment already exists
      const reportCommentRepository =
        AppDataSource.getRepository(CommentReport);
      const checkReport = await reportCommentRepository.findOne({
        where: {
          comment: { id: checkComment.id },
          user: { id: userId },
          is_active: true,
        },
        select: {
          id: true,
          is_report: true,
        },
      });

      if (!checkReport) {
        // create comment report and check
        await reportCommentRepository.insert({
          comment: { id: checkComment.id },
          user: { id: userId },
          is_report: true,
        });

        return res.status(201).json({
          status: "success",
          message: `you successfly report comment ${checkComment.id}`,
        });
      } else {
        return res.status(400).json({
          status: false,
          message: "you already report this comment",
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// get list of comment reports
/**
 * @swagger
 * /v1/user/comment_music/comment/reports_list:
 *   get:
 *     summary: دریافت لیست گزارش‌های کامنت
 *     description: |
 *       این endpoint برای دریافت لیست گزارش‌های کامنت با قابلیت صفحه‌بندی و فیلتر استفاده می‌شود.
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت دارد
 *       - قابلیت فیلتر بر اساس وضعیت گزارش
 *       - مرتب‌سازی بر اساس تاریخ ایجاد (نزولی)
 *       - اطلاعات کامل کامنت و کاربر گزارش‌دهنده نمایش داده می‌شود
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه
 *     responses:
 *       200:
 *         description: لیست گزارش‌ها با موفقیت دریافت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 total:
 *                   type: integer
 *                   description: تعداد کل گزارش‌ها
 *                   example: 120
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 total_pages:
 *                   type: integer
 *                   description: تعداد کل صفحات
 *                   example: 6
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه گزارش
 *                         example: 12
 *                       is_report:
 *                         type: boolean
 *                         description: وضعیت گزارش
 *                         example: true
 *                       is_active:
 *                         type: boolean
 *                         description: وضعیت فعال بودن گزارش
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ ایجاد گزارش
 *                         example: "2024-01-20T14:30:00.000Z"
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 8
 *                           username:
 *                             type: string
 *                             example: "reporter_user"
 *                           first_name:
 *                             type: string
 *                             example: "علی"
 *                           last_name:
 *                             type: string
 *                             example: "رضایی"
 *                       comment:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 15
 *                           content:
 *                             type: string
 *                             description: متن کامنت
 *                             example: "این کامنت محتوای نامناسب دارد"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             description: تاریخ ایجاد کامنت
 *                             example: "2024-01-19T10:15:00.000Z"
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 5
 *                               username:
 *                                 type: string
 *                                 example: "comment_owner"
 *                               first_name:
 *                                 type: string
 *                                 example: "مریم"
 *                               last_name:
 *                                 type: string
 *                                 example: "کریمی"
 *       401:
 *         description: نیاز به احراز هویت
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
 *                   example: Unauthorized
 *       403:
 *         description: دسترسی غیرمجاز (فقط ادمین)
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
 *                   example: Access denied. Admin only.
 *       500:
 *         description: خطای سرور
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
 *                   example: server error
 *                 error:
 *                   type: string
 */
router.get(
  "/comment/reports_list",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const reportRepository = AppDataSource.getRepository(CommentReport);

      const userId = (req as any).user.user_id;

      const queryBuilder = reportRepository
        .createQueryBuilder("commentReport")
        .leftJoinAndSelect("commentReport.user", "user")
        .leftJoinAndSelect("commentReport.comment", "comment")
        .orderBy("commentReport.createdAt", "DESC")
        .where("commentReport.is_active = :isActive", {isActive: true})
        .andWhere("user.id = :id", {id: userId})
        .skip(skip)
        .take(limit);
      queryBuilder.select([
        "commentReport.id",
        "commentReport.is_report",
        "commentReport.createdAt",
        "user.id",
        "comment.id",
      ]);

      const [reports, total] = await queryBuilder.getManyAndCount();
      const simpleData = reports.map(
        d => (
          {
            id: d.id,
            user_id: d.user.id,
            comment_id: d.comment.id,
            created_at: d.createdAt,
            is_report: d.is_report
          }
        )
      )
      return res.status(200).json({
        status: "success",
        total,
        page,
        total_pages: Math.ceil(total / limit),
        limit,
        data: simpleData
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

// get comment report details
/**
 * @swagger
 * /v1/user/comment_music/comment/reports_list/{id}:
 *   get:
 *     summary: دریافت جزئیات یک گزارش کامنت
 *     description: |
 *       این endpoint برای دریافت جزئیات کامل یک گزارش خاص از کامنت استفاده می‌شود.
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت دارد
 *       - اطلاعات کامل کاربر گزارش‌دهنده، کامنت گزارش‌شده و صاحب کامنت را برمی‌گرداند
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه گزارش کامنت
 *         example: 12
 *     responses:
 *       200:
 *         description: جزئیات گزارش با موفقیت دریافت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 12
 *                     is_report:
 *                       type: boolean
 *                       example: true
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T14:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-20T14:30:00.000Z"
 *                     reporter:
 *                       type: object
 *                       description: کاربر گزارش‌دهنده
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 8
 *                         username:
 *                           type: string
 *                           example: "reporter_user"
 *                         first_name:
 *                           type: string
 *                           example: "علی"
 *                         last_name:
 *                           type: string
 *                           example: "رضایی"
 *                         email:
 *                           type: string
 *                           example: "ali.rezaei@example.com"
 *                         phone:
 *                           type: string
 *                           example: "09123456789"
 *                     comment:
 *                       type: object
 *                       description: کامنت گزارش‌شده
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 15
 *                         content:
 *                           type: string
 *                           example: "این کامنت محتوای نامناسب دارد"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-19T10:15:00.000Z"
 *                         is_active:
 *                           type: boolean
 *                           example: true
 *                         owner:
 *                           type: object
 *                           description: صاحب کامنت
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 5
 *                             username:
 *                               type: string
 *                               example: "comment_owner"
 *                             first_name:
 *                               type: string
 *                               example: "مریم"
 *                             last_name:
 *                               type: string
 *                               example: "کریمی"
 *                             email:
 *                               type: string
 *                               example: "maryam.karimi@example.com"
 *       400:
 *         description: شناسه گزارش نامعتبر
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
 *                   example: Invalid report ID
 *       401:
 *         description: نیاز به احراز هویت
 *       403:
 *         description: دسترسی غیرمجاز (فقط ادمین)
 *       404:
 *         description: گزارش پیدا نشد
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
 *                   example: Report not found
 *       500:
 *         description: خطای سرور
 */
router.get(
  "/comment/reports_list/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      
      if (isNaN(reportId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid report ID"
        });
      }

      const reportRepository = AppDataSource.getRepository(CommentReport);
      const userId = (req as any).user.user_id;
  
      const report = await reportRepository
        .createQueryBuilder("commentReport")
        .leftJoinAndSelect("commentReport.user", "reporter")
        .leftJoinAndSelect("commentReport.comment", "comment")
        .where("commentReport.id = :reportId", { reportId })
        .andWhere("commentReport.is_active = :isActive", {isActive: true})
        .andWhere("reporter.id = :id", {id: userId})
        .select([
          "commentReport.id",
          "commentReport.is_report",
          "commentReport.createdAt",
          "reporter.id",
          "comment.id",
        ])
        .getOne();

      if (!report) {
        return res.status(404).json({
          status: false,
          message: "Report not found"
        });
      }

      const simpleData = {
        id: report.id,
        user_id: report.user.id,
        comment_id: report.comment.id,
        created_at: report.comment.createdAt,
        is_report: report.is_report
      }

      return res.status(200).json({
        status: "success",
        data: simpleData
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

export const commentMusicRouter = router;
