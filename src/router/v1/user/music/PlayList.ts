import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Playlist } from "../../../../entity/Playlist";
import { plainToClass } from "class-transformer";
import { CreatePLayListDto } from "../../../../dtos/music/PlayListDto";
import { validate } from "class-validator";
import { User } from "../../../../entity/User";

export const playListRouter = Router();


// get all playlist
/**
 * @swagger
 * /v1/user/play_list/my_play_list:
 *   get:
 *     summary: دریافت لیست پلی‌لیست‌های کاربر
 *     description: دریافت تمام پلی‌لیست‌های فعال کاربر با امکان صفحه‌بندی
 *     tags: [Playlists]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه
 *     responses:
 *       200:
 *         description: لیست پلی‌لیست‌های کاربر با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 skip:
 *                   type: integer
 *                   description: تعداد آیتم‌های رد شده
 *                   example: 0
 *                 total:
 *                   type: integer
 *                   description: تعداد کل پلی‌لیست‌ها
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Playlist'
 *       401:
 *         description: عدم دسترسی - توکن معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
playListRouter.get(
    "/my_play_list/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user by request
            const userId = (req as any).user.user_id;

            // pagination
            const limit = parseInt(req.query.limit as string) || 20;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * limit;
            // repository
            const playListRepository = AppDataSource.getRepository(Playlist);
            const [allPlayList, total] = await playListRepository.findAndCount(
                {
                    where: {
                        user: {
                            id: userId
                        },
                        is_active: true
                    },
                    take: limit,
                    skip: skip,
                    select: ['id', 'title', 'description', 'createdAt', 'updatedAt']
                }
            );

            return res.status(200).json(
                {
                    status: "success",
                    page: page,
                    limit: limit,
                    skip: skip,
                    total: total,
                    data: allPlayList
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

// create playlist
/**
 * @swagger
 * /v1/user/play_list/create_play_list:
 *   post:
 *     summary: ایجاد پلی‌لیست جدید
 *     description: کاربر می‌تواند یک پلی‌لیست جدید ایجاد کند
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaylistRequest'
 *     responses:
 *       201:
 *         description: پلی‌لیست با موفقیت ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: شناسه پلی‌لیست ایجاد شده
 *                     title:
 *                       type: string
 *                       description: عنوان پلی‌لیست
 *       400:
 *         description: خطای اعتبارسنجی یا داده‌های نادرست
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
 *                   example: request body is required
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         description: نام فیلد دارای خطا
 *                       value:
 *                         type: object
 *                         description: محدودیت‌های اعتبارسنجی
 *       401:
 *         description: عدم دسترسی - توکن معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePlaylistRequest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           description: عنوان پلی‌لیست
 *           minLength: 1
 *           maxLength: 100
 *           example: "آهنگ‌های مورد علاقه من"
 *         description:
 *           type: string
 *           description: توضیحات پلی‌لیست (اختیاری)
 *           maxLength: 255
 *           example: "لیست آهنگ‌های مورد علاقه برای مهمانی"
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Server error
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
playListRouter.post(
    "/create_play_list/",
    authenticateJWT,
    async(req: Request, res: Response) => {
        try {
            // get user id 
            const userId = (req as any).user.user_id;

            // check req body
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            // dto
            const playListDto = plainToClass(CreatePLayListDto, req.body);
            const errors = await validate(playListDto);
            
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
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

            // create playlist
            const playList = new Playlist();
            playList.user = {id: Number(userId)} as User;
            playList.title = playListDto.title;
            playList.description = playListDto.description;
            await playList.save()

            return res.status(201).json(
                {
                    status: false,
                    data: {
                        id: playList.id,
                        title: playList.title
                    }
                }
            )

        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "Server error"
                }
            );
        }
    }
);

/**
 * @swagger
 * /v1/user/play_list/delete_play_list/{play_list_id}:
 *   delete:
 *     summary: حذف پلی‌لیست
 *     description: کاربر می‌تواند پلی‌لیست خود را حذف کند (حذف نرم - is_active = false)
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: play_list_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه پلی‌لیست برای حذف
 *     responses:
 *       200:
 *         description: پلی‌لیست با موفقیت حذف شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Playlist deleted successfully
 *       400:
 *         description: شناسه پلی‌لیست نامعتبر است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: کاربر مجوز حذف این پلی‌لیست را ندارد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: پلی‌لیست پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
playListRouter.delete(
    "/delete_play_list/:play_list_id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const playListId = parseInt(req.params.play_list_id);

            // is valid playlistId params
            if (isNaN(playListId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid playlist ID"
                });
            }

            const playListRepository = AppDataSource.getRepository(Playlist);
            
            // find playlist
            const playList = await playListRepository.findOne({
                where: { id: playListId },
                relations: ["user"]
            });

            if (!playList) {
                return res.status(404).json({
                    status: false,
                    message: "Playlist not found"
                });
            }

            // check owner playlist
            if (playList.user.id !== Number(userId)) {
                return res.status(403).json({
                    status: false,
                    message: "You don't have permission to delete this playlist"
                });
            }

            // delete playlist
            playList.is_active = false;
            await playListRepository.save(playList);

            return res.status(200).json({
                status: true,
                message: "Playlist deleted successfully"
            });

        } catch (error) {
            console.error("Delete playlist error:", error);
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);

// update playlist
/**
 * @swagger
 * /v1/user/play_list/update_play_list/{play_list_id}:
 *   patch:
 *     summary: بروزرسانی پلی‌لیست
 *     description: کاربر می‌تواند پلی‌لیست خود را ویرایش کند
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: play_list_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه پلی‌لیست برای ویرایش
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                  type: string
 *                  description: عنوان پلی لیست
 *               description:
 *                  type: string
 *                  description: توضیحی در مورد پلی لیست
 *     responses:
 *       200:
 *         description: پلی‌لیست با موفقیت بروزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Playlist'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: کاربر مجوز ویرایش این پلی‌لیست را ندارد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: پلی‌لیست پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
playListRouter.patch(
    "/update_play_list/:play_list_id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const playListId = parseInt(req.params.play_list_id);

            // check playlistId in params
            if (isNaN(playListId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid playlist ID"
                });
            }

            // check request body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "Request body is required"
                });
            }

            const playListRepository = AppDataSource.getRepository(Playlist);
            
            // find playlist
            const playList = await playListRepository.findOne({
                where: { id: playListId, is_active: true },
                relations: ["user"]
            });

            if (!playList) {
                return res.status(404).json({
                    status: false,
                    message: "Playlist not found"
                });
            }

            // check ownwer playlist
            if (playList.user.id !== Number(userId)) {
                return res.status(403).json({
                    status: false,
                    message: "You don't have permission to update this playlist"
                });
            }

            // update field
            if (req.body.title !== undefined) {
                playList.title = req.body.title;
            }
            
            if (req.body.description !== undefined) {
                playList.description = req.body.description;
            }

            // save after update
            await playListRepository.save(playList);

            return res.status(200).json({
                status: true,
                data: {
                    id: playList.id,
                    title: playList.title,
                    description: playList.description,
                    is_active: playList.is_active
                }
            });

        } catch (error) {
            console.error("Update playlist error:", error);
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);