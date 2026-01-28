// src/router/v1/user/music/CommentRouter.ts
import { Router, Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Comment } from "../../../../entity/Comment";
import { User } from "../../../../entity/User";
import { Song } from "../../../../entity/Song";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { plainToClass } from "class-transformer";
import { CreateCommentDTO } from "../../../../dtos/music/CommentDto";
import { validate } from "class-validator";
import { error } from "console";

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
      // const userRepository = AppDataSource.getRepository(User)
      // const getUser = await userRepository.findOne(
      //   {
      //     where: {id: userId, is_active: true},
      //     select: ['id']
      //   }
      // );
      // if (!getUser) {
      //   return res.status(404).json(
      //     {
      //       status: false,
      //       message: "user not found"
      //     }
      //   )
      // }

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

export const commentMusicRouter = router;
