import express from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Follow } from "../../../../entity/Follow";
import { plainToClass } from "class-transformer";
import { FollowDto } from "../../../../dtos/auth/FollowDto";
import { validate } from "class-validator";
import { User } from "../../../../entity/User";

export const followRouter = express.Router();

// followrs
/**
 * @swagger
 * /v1/follow/user/followers:
 *   get:
 *     summary: Get user followers list
 *     description: Retrieve paginated list of followers for authenticated user
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved followers list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 totalCount:
 *                   type: integer
 *                   example: 15
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       to_user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           username:
 *                             type: string
 *                           profile:
 *                             type: object
 *                             properties:
 *                               profile_image:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   url:
 *                                     type: string
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
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
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
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
 *                   example: "server error"
 */
followRouter.get(
  "/followers/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    // get data and pagination
    try {
      const userId = (req as any).user.user_id;
      const limit = parseInt(req.query.limit as string) || 20;
      const page = 1;
      const skip = (page - 1) * limit;
      const followRepository = AppDataSource.getRepository(Follow);
      const [follow, totalCount] = await followRepository.findAndCount({
        where: {
          to_user: {
            id: userId,
            is_active: true,
          },
        },
        relations: {
          from_user: {
            profile_image: true,
          },
        },
        select: {
          id: true,
          from_user: {
            id: true,
            username: true,
            is_artist: true,
            user_artist_set: {
              id: true,
            },
            profile_image: {
              id: true,
              image_path: true,
            },
          },
        },

        take: limit,
        skip: skip,
      });
      const simpleData = follow.map((item) => ({
        followrs_id: item.id,
        from_user_id: item.from_user.id,
        from_user_artist_id: item.from_user.user_artist_set?.id || null,
        from_user_is_artist: item.from_user.is_artist,
        from_user_username: item.from_user.username,
        from_user_profile_image:
          item.from_user.profile_image?.image_path || null,
      }));
      return res.status(200).json({
        status: "success",
        totalCount: totalCount,
        take: limit,
        page: page,
        data: simpleData,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);

// following
/**
 * @swagger
 * /v1/follow/user/following:
 *   get:
 *     summary: Get user following list
 *     description: Retrieve paginated list of users that the authenticated user is following
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved following list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 totalCount:
 *                   type: integer
 *                   example: 45
 *                 take:
 *                   type: integer
 *                   example: 20
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       to_user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           username:
 *                             type: string
 *                             example: "john_doe"
 *                           profile:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 456
 *                               profile_image:
 *                                 type: object
 *                                 properties:
 *                                   image_path:
 *                                     type: string
 *                                     example: "/images/profile.jpg"
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
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
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
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
 *                   example: "server error"
 */
followRouter.get(
  "/following/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    // get data and pagination
    try {
      const userId = (req as any).user.user_id;
      const limit = parseInt(req.query.limit as string) || 20;
      const page = 1;
      const skip = (page - 1) * limit;
      const followRepository = AppDataSource.getRepository(Follow);
      const [follow, totalCount] = await followRepository.findAndCount({
        where: {
          is_active: true,
          from_user: {
            id: userId,
            is_active: true,
          },
        },
        relations: {
          to_user: {
            user_artist_set: true,
            profile_image: true,
          },
        },
        select: {
          id: true,
          to_user: {
            is_active: true,
            user_artist_set: {
              id: true,
            },
            id: true,
            username: true,
            profile_image: {
              id: true,
              image_path: true,
            }
          },
        },
        take: limit,
        skip: skip,
      });
      const simpleData = follow.map((item) => ({
        following_id: item.id,
        to_user_id: item.to_user.id,
        to_user_is_artist: item.to_user?.user_artist_set || false,
        to_user_artist_id: item.to_user.user_artist_set?.id || null,
        to_user_username: item.to_user.username,
        to_user_profile_image: item.to_user.profile_image?.image_path || null,
      }));
      return res.status(200).json({
        status: "success",
        totalCount: totalCount,
        take: limit,
        page: page,
        data: simpleData,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);

// create follow
/**
 * @swagger
 * components:
 *   schemas:
 *     FollowDto:
 *       type: object
 *       required:
 *         - to_user_id
 *       properties:
 *         to_user_id:
 *           type: integer
 *           description: شناسه کاربری که می‌خواهید فالو کنید
 *           example: 123
 *     FollowSuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         message:
 *           type: string
 *           example: "You have successfully followed the user."
 *         data:
 *           type: object
 *           properties:
 *             follow_id:
 *               type: integer
 *               example: 1
 *             from_user_id:
 *               type: integer
 *               example: 1
 *             to_user_id:
 *               type: integer
 *               example: 123
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
 *                 example: "to_user_id"
 *               value:
 *                 type: object
 *                 properties:
 *                   isNumber:
 *                     type: string
 *                     example: "to_user_id must be a number"
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
 * /v1/follow/user/add_follow:
 *   post:
 *     tags:
 *       - Follow
 *     summary: فالو کردن یک کاربر
 *     description: |
 *       ایجاد رابطه فالو بین کاربر جاری و کاربر هدف
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - کاربر نمی‌تواند خودش را فالو کند
 *       - کاربر نمی‌تواند یک کاربر را دو بار فالو کند
 *       - هر دو کاربر باید فعال (is_active=true) باشند
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FollowDto'
 *           examples:
 *             example1:
 *               summary: نمونه درخواست
 *               value:
 *                 to_user_id: 123
 *     responses:
 *       '201':
 *         description: کاربر با موفقیت فالو شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FollowSuccessResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   message: "You have successfully followed the user."
 *                   data:
 *                     follow_id: 1
 *                     from_user_id: 1
 *                     to_user_id: 123
 *       '400':
 *         description: خطای اعتبارسنجی یا فالوی تکراری
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
 *                     - field: "to_user_id"
 *                       value:
 *                         isNumber: "to_user_id must be a number"
 *               already_following:
 *                 summary: کاربر قبلاً فالو شده
 *                 value:
 *                   status: false
 *                   message: "you have already follow this user!"
 *               self_follow:
 *                 summary: کاربر نمی‌تواند خودش را فالو کند
 *                 value:
 *                   status: false
 *                   message: "You cannot follow yourself"
 *       '404':
 *         description: کاربر مبدا یا مقصد یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               from_user_not_found:
 *                 summary: کاربر مبدا یافت نشد
 *                 value:
 *                   status: false
 *                   message: "from_user not found"
 *               to_user_not_found:
 *                 summary: کاربر مقصد یافت نشد
 *                 value:
 *                   status: false
 *                   message: "to_user_id not found"
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
followRouter.post(
  "/add_follow",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;

      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }
      const followDto = plainToClass(FollowDto, req.body);
      const errors = await validate(followDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid Data",
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }

      // check follow dose exists
      const followRepository = AppDataSource.getRepository(Follow);
      const checkFollow = await followRepository.findOne({
        where: {
          to_user: { id: followDto.to_user_id },
          is_active: true,
        },
        select: {
          id: true,
        },
      });
      if (checkFollow) {
        return res.status(400).json({
          status: false,
          message: "you have already follow this user!",
        });
      }

      // get from_user and to_user
      const userRepository = AppDataSource.getRepository(User);
      const checkFromUser = await userRepository.findOne({
        where: {
          id: userId,
          is_active: true,
        },
        select: {
          id: true,
        },
      });
      if (!checkFromUser) {
        return res.status(404).json({
          status: false,
          message: "from_user found",
        });
      }
      const checkToUser = await userRepository.findOne({
        where: {
          id: followDto.to_user_id,
          is_active: true,
        },
        select: {
          id: true,
        },
      });
      if (!checkToUser) {
        return res.status(404).json({
          status: false,
          message: "to_user_id not found",
        });
      }
      // create follow
      const follow = new Follow();
      follow.from_user = checkFromUser;
      follow.to_user = checkToUser;
      follow.is_active = true;
      await follow.save();
      return res.status(201).json({
        status: "success",
        message: "You have successfully followed someone.",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);

// unfollow user
/**
 * @swagger
 * /v1/follow/user/unfollow/{user_id}:
 *   delete:
 *     summary: Unfollow a user
 *     description: Soft delete follow relationship by setting is_active to false
 *     tags:
 *       - Follow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID of the user to unfollow
 *     responses:
 *       200:
 *         description: Successfully unfollowed user
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
 *                   example: "User unfollowed successfully"
 *       400:
 *         description: Bad request - User is not being followed or invalid user ID
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
 *                   example: "You are not following this user"
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       500:
 *         description: Internal server error
 */
followRouter.delete(
  "/unfollow/:user_id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const fromUserId = (req as any).user.user_id;
      const toUserId = parseInt(req.params.user_id);

      // Validate user_id parameter
      if (isNaN(toUserId) || toUserId <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid user ID",
        });
      }

      const followRepository = AppDataSource.getRepository(Follow);

      // Update directly using update query (more efficient)
      const checkToUser = await followRepository.findOne({
        where: {
          is_active: true,
          to_user: { id: toUserId },
        },
        select: {
          id: true,
          is_active: true,
        },
      });
      checkToUser.is_active = false;
      await checkToUser.save();
      // Check if any record was updated
      if (!checkToUser) {
        return res.status(400).json({
          status: false,
          message: "You are not following this user",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "User unfollowed successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);
