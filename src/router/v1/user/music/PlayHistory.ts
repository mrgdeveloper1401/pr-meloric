import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { PlayHistory } from "../../../../entity/PlayHistory";
import { Song } from "../../../../entity/Song";
import { User } from "../../../../entity/User";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { Router, Request, Response } from "express";
import { CreatePlayHistoryDto } from "../../../../dtos/music/CreatePlayHistoryDto";
// import { Playlist } from "../../../../entity/Playlist";


export const playHistoryRouter = Router()

// create play history
/**
 * @swagger
 * /v1/user/play/play_music:
 *   post:
 *     summary: افزودن آهنگ به تاریخچه پخش 
 *     description: وقتی این اندپوینت صدا زده میشه ابه اهنگ های اخیر گوش داده شده اضافه میشه
 *     tags: [PlayHistory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - song_id
 *               - played_at
 *             properties:
 *               song_id:
 *                 type: integer
 *                 description: شناسه آهنگ
 *                 example: 123
 *               played_at:
 *                 type: string
 *                 format: date-time
 *                 description: تاریخ و زمان پخش
 *                 example: "2023-12-01T10:30:00.000Z"
 *
 *     responses:
 *       201:
 *         description: آهنگ با موفقیت به تاریخچه پخش اضافه شد
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
 *                       description: شناسه رکورد تاریخچه پخش
 *                     played_at:
 *                       type: string
 *                       format: date-time
 *                       description: تاریخ و زمان پخش
 *       400:
 *         description: داده‌های ورودی نامعتبر
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
 *                   example: Validation error
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
 *       403:
 *         description: کاربر دسترسی به این پلی‌لیست ندارد
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
 *                   example: You don't have permission to access this playlist
 *       404:
 *         description: پلی‌لیست یا آهنگ پیدا نشد
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
 *                   example: Playlist or song not found
 *       500:
 *         description: خطای سرور داخلی
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
 *                   example: Server error
 */
playHistoryRouter.post(
    "/play_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;

            // check request body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "Request body is required"
                });
            }

            // validate DTO
            const playHistoryDto = plainToClass(CreatePlayHistoryDto, req.body);
            const errors = await validate(playHistoryDto);
            
            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    error: errors.map(err => ({
                        field: err.property,
                        value: err.constraints
                    }))
                });
            }

            // check music if exists
            const songRepository = AppDataSource.getRepository(Song);
            const song = await songRepository.findOne({
                where: { id: playHistoryDto.song_id, is_active: true },
                select: ['id']
            });

            if (!song) {
                return res.status(404).json({
                    status: false,
                    message: "Song not found"
                });
            }

            // Create a playback history record
            const playHistoryRepository = AppDataSource.getRepository(PlayHistory);
            const playHistory = new PlayHistory();
            
            playHistory.user = { id: Number(userId) } as User;
            playHistory.song = { id: playHistoryDto.song_id } as Song;
            
            // تبدیل تاریخ به فرمت صحیح
            const playedAtDate = new Date(playHistoryDto.played_at);
            if (isNaN(playedAtDate.getTime())) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid date format for played_at"
                });
            }
            
            playHistory.played_at = playedAtDate;
            await playHistoryRepository.save(playHistory);

            return res.status(201).json({
                status: true,
                data: {
                    id: playHistory.id,
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);

// get play history
/**
 * @swagger
 * /v1/user/play/play_history:
 *   get:
 *     summary: دریافت تاریخچه پخش کاربر
 *     description: دریافت لیست آهنگ‌های پخش شده توسط کاربر با امکان صفحه‌بندی
 *     tags: [PlayHistory]
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
 *         description: لیست تاریخچه پخش با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlayHistory'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
playHistoryRouter.get(
    "/play_history",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;

            // pagination
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const playHistoryRepository = AppDataSource.getRepository(PlayHistory); // TODO, better query builder
            
            // get playlist
            const [playHistory, total] = await playHistoryRepository.findAndCount({
                where: { 
                    user: { id: Number(userId) },
                    is_active: true 
                },
                relations: {
                    song: {
                        image: true,
                        audio: true,
                        album: true,
                        artist: {
                            // cover_image: true,
                            user: {
                                profile: true,
                                cover_image: true
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    played_at: true,
                    song: {
                        music_lyrics: true,
                        createdAt: true,
                        release_date: true,
                        play_count: true,
                        artist: {
                            id: true,
                            nick_name: true,
                            // cover_image: {
                            //     image_path: true
                            // },
                            user: {
                                id: true,
                                username: true,
                                first_name: true,
                                last_name: true,
                                cover_image: {
                                    id: true,
                                    image_path: true
                                },
                                profile: {
                                    id: true,
                                    // first_name: true,
                                    // last_name: true
                                },
                            },
                        },
                        album: {
                            title: true
                        },
                        title: true,
                        image: {
                            image_path: true
                        },
                        audio: {
                            audio_file_path: true
                        }
                    }
                },
                skip,
                take: limit,
            });

            const totalPages = Math.ceil(total / limit);
            const simpleData = playHistory.map(
                (item) => (
                    {
                        id: item.id,
                        artist_id: item.song.artist.id,
                        played_at: item.played_at,
                        music_image: item.song.image?.image_path || null,
                        music_adio: item.song.audio.audio_file_path,
                        artist_first_name: item.song.artist.user?.first_name || null,
                        artist_last_name: item.song.artist.user?.last_name || null,
                        nick_name: item.song.artist?.nick_name || null,
                        username: item.song.artist.user.username,
                        album_title: item.song.album.title,
                        song_title: item.song.title,
                        music_lyric: item.song?.music_lyrics || null,
                        created_at: item.song.createdAt,
                        realaese_date: item.song.release_date,
                        play_count: item.song.play_count
                    }
                )
            )
            return res.status(200).json({
                status: true,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    itemsPerPage: limit
                },
                data: simpleData,
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);

// update play history
/**
 * @swagger
 * /v1/user/play/play_history/{id}:
 *   patch:
 *     summary: بروزرسانی رکورد تاریخچه پخش
 *     description: بروزرسانی یک رکورد خاص در تاریخچه پخش
 *     tags: [PlayHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه رکورد تاریخچه پخش
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *              type: object
 *              properties:
 *                played_at:
 *                    type: string
 *                    description: تاریخ اخرین پخش       
 *     responses:
 *       200:
 *         description: رکورد تاریخچه پخش با موفقیت بروزرسانی شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PlayHistory'
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: کاربر مجوز ویرایش این رکورد را ندارد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: رکورد تاریخچه پخش پیدا نشد
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
playHistoryRouter.patch(
    "/play_history/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const playHistoryId = parseInt(req.params.id);

            if (isNaN(playHistoryId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid play history ID"
                });
            }

            const playHistoryRepository = AppDataSource.getRepository(PlayHistory);
            
            // find playhistory
            const playHistory = await playHistoryRepository.findOne({
                where: { id: playHistoryId, is_active: true , user: {id: userId}},
                select: ['id']
            });

            if (!playHistory) {
                return res.status(404).json({
                    status: false,
                    message: "Play history record not found"
                });
            }

            // check field
            if (req.body.played_at !== undefined) {
                playHistory.played_at = new Date(req.body.played_at);
            }

            await playHistoryRepository.save(playHistory);

            return res.status(200).json({
                status: "success",
                data: {
                    id: playHistory.id,
                    played_at: playHistory.played_at
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);

// delete play history
/**
 * @swagger
 * /v1/user/play/play_history/{id}:
 *   delete:
 *     summary: حذف رکورد از تاریخچه پخش
 *     description: حذف نرم یک رکورد از تاریخچه پخش (is_active = false)
 *     tags: [PlayHistory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه رکورد تاریخچه پخش
 *     responses:
 *       200:
 *         description: رکورد با موفقیت حذف شد
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
 *                   example: Play history record deleted successfully
 *       400:
 *         description: شناسه نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: کاربر مجوز حذف این رکورد را ندارد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: رکورد پیدا نشد
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
playHistoryRouter.delete(
    "/play_history/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const playHistoryId = parseInt(req.params.id);

            if (isNaN(playHistoryId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid play history ID"
                });
            }

            const playHistoryRepository = AppDataSource.getRepository(PlayHistory);
            
            // find playhistory
            const playHistory = await playHistoryRepository.findOne({
                where: { id: playHistoryId, is_active: true, user: {id: userId} },
                // relations: ["user"],
                select: ['id']
            });

            if (!playHistory) {
                return res.status(404).json({
                    status: false,
                    message: "Play history record not found"
                });
            }

            // delete
            playHistory.is_active = false;
            await playHistoryRepository.save(playHistory);

            return res.status(200).json({
                status: true,
                message: "Play history record deleted successfully"
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);
