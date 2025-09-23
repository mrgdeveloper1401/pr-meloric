import express from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Follow } from "../../../../entity/Follow";

export const followRouter = express.Router();


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
            const [follow, totalCount] = await followRepository.findAndCount(
                {
                    where: {
                        to_user: {
                            id: userId,
                            is_active: true
                        },
                    },
                    relations: {
                        from_user: {
                            profile: {
                                profile_image: true
                            }
                        }
                    },
                    select: {
                        id: true,
                        from_user: {
                            id: true,
                            username: true,
                            profile: {
                                id: true,
                                profile_image: {
                                    image_path: true
                                }
                            }
                        }
                    },

                    take: limit,
                    skip: skip
                }
            )
            return res.status(200).json(
                {
                    status: "success",
                    totalCount: totalCount,
                    take: limit,
                    page: page,
                    data: follow
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
)

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
            const [follow, totalCount] = await followRepository.findAndCount(
                {
                    where: {
                        from_user: {
                            id: userId,
                            is_active: true
                        },
                    },
                    relations: {
                        to_user: {
                             profile: {
                                profile_image: true
                             }
                        }
                    },
                    select: {
                        id: true,
                        to_user: {
                            id: true,
                            username: true,
                            profile: {
                                id: true,
                                profile_image: {
                                    image_path: true
                                }
                            }
                        }
                    },
                    take: limit,
                    skip: skip
                }
            )
            return res.status(200).json(
                {
                    status: "success",
                    totalCount: totalCount,
                    take: limit,
                    page: page,
                    data: follow
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
)