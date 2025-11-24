import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { plainToClass } from "class-transformer";
import { favoriteMusicDto } from "../../../../dtos/music/FavoritMusicDto";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { FavoriteSong } from "../../../../entity/FavoriteSong";
import { Song } from "../../../../entity/Song";

export const favoriteRouter = Router();


// create favorite music
/**
 * @swagger
 * /v1/user/favorite/create_favorite_music:
 *   post:
 *     summary: افزودن موزیک به لیست علاقه‌مندی‌ها
 *     description: این endpoint برای افزودن یک موزیک به لیست علاقه‌مندی‌های کاربر استفاده می‌شود
 *     tags: [Favorite]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - music_id
 *             properties:
 *               music_id:
 *                 type: integer
 *                 description: شناسه موزیک
 *                 example: 123
 *     responses:
 *       201:
 *         description: موزیک با موفقیت به علاقه‌مندی‌ها اضافه شد
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
 *                   example: "successfully add music"
 *       400:
 *         description: داده‌های نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "music_id"
 *                       value:
 *                         type: object
 *                         properties:
 *                           isNumber:
 *                             type: string
 *                             example: "music_id must be a number"
 *       404:
 *         description: موزیک یافت نشد
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
 *                   example: "music not found"
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
 *                   example: "server error"
 */
favoriteRouter.post(
    "/create_favorite_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            // validate data
            const musicDto = plainToClass(favoriteMusicDto, req.body);
            const errors = await validate(musicDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        error: errors.map(
                            error => (
                                {
                                    field: error.property,
                                    value: error.constraints
                                }
                            )
                        )
                    }
                );
            }

            // get song(music)
            const musicRepository = AppDataSource.getRepository(Song);
            const getMusic = await musicRepository.findOne(
                {
                    where: {id: musicDto.music_id, is_active: true},
                    select: ['id']
                }
            );
            if (!getMusic) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "music not found"
                    }
                );
            }

            // check unique favorite_song and user
            const favoriteRepository = AppDataSource.getRepository(FavoriteSong)
            const checkFavorite = await favoriteRepository.findOne(
                {
                    where: {
                        song: {id: musicDto.music_id}, 
                        is_active: true, 
                        user: {id: userId}
                    },
                    select: {
                        id: true
                    }
                }
            );
            if (checkFavorite) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "song already exists in favorite music"
                    }
                )
            }
            // create favorite
            const favorite = new FavoriteSong();
            favorite.user = userId;
            favorite.song = getMusic;
            await favorite.save();

            return res.status(201).json(
                {
                    status: "success",
                    message: "successfully add favorite music"
                }
            );
        } catch (error) {
            //   if (error.code === '23505') {
            //     return res.status(409).json({
            //     status: false,
            //     message: "This music has already been added to favorites."
            //     });
            // }
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }

);

// list favorit music
/**
 * @swagger
 * /v1/user/favorite/my_favorit_music/:
 *   get:
 *     summary: دریافت لیست آهنگ‌های موردعلاقه کاربر
 *     description: |
 *       این endpoint برای دریافت لیست آهنگ‌های موردعلاقه کاربر جاری با قابلیت صفحه‌بندی استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Favorite
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
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه (حداکثر 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست آهنگ‌های موردعلاقه با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 skip:
 *                   type: integer
 *                   description: تعداد آیتم‌های رد شده
 *                   example: 0
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 total:
 *                   type: integer
 *                   description: تعداد کل آهنگ‌های موردعلاقه
 *                   example: 45
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FavoriteSongResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   limit: 20
 *                   skip: 0
 *                   page: 1
 *                   total: 45
 *                   data:
 *                     - id: 1
 *                       song:
 *                         id: 123
 *                         title: "آهنگ نمونه ۱"
 *                         image:
 *                           image_path: "https://example.com/images/song1.jpg"
 *                     - id: 2
 *                       song:
 *                         id: 124
 *                         title: "آهنگ نمونه ۲"
 *                         image:
 *                           image_path: "https://example.com/images/song2.jpg"
 *                     - id: 3
 *                       song:
 *                         id: 125
 *                         title: "آهنگ نمونه ۳"
 *                         image:
 *                           image_path: null
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
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "server error"
 *             examples:
 *               server_error:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "server error"
 */
favoriteRouter.get(
    "/my_favorit_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const limit = Number(req.query.limit) || 20;
            const page = Number(req.query.page) || 1;
            const skip = (page - 1) * limit;
            const favoritMusicRepository = AppDataSource.getRepository(FavoriteSong);
            const [favoritMusics, total] = await favoritMusicRepository.findAndCount(
                {
                    where: {
                        user: {id: userId},
                        is_active: true
                    },
                    select: {
                        id: true,
                        song: {
                            id: true,
                            title: true,
                            createdAt: true,
                            play_count: true,
                            release_date: true,
                            artist: {
                                id: true,
                                nick_name: true,
                                user: {
                                    id: true,
                                    username: true,
                                    profile: {
                                        id: true,
                                        first_name: true,
                                        last_name: true
                                    }
                                }
                            },
                            audio: {
                                audio_file_path: true
                            },
                            image: {
                                image_path: true
                            }
                        }
                    },
                    relations: {
                        song: {
                            image: true,
                            audio: true,
                            artist: {
                                user: {
                                    profile: true
                                }
                            }
                        }
                    },
                    take: limit,
                    skip: skip
                }
            );

            // show data
            const simpleData = favoritMusics.map(
                item => (
                    {
                        id: item.id,
                        song_id: item.song.id,
                        artist_id: item.song.artist.id,
                        title: item.song.title,
                        audio_path: item.song.audio.audio_file_path,
                        image_path: item.song.image?.image_path || null,
                        artist_nick_name: item.song.artist?.nick_name || null,
                        artist_first_name: item.song.artist.user.profile.first_name || null,
                        artist_last_name: item.song.artist.user.profile?.last_name || null,
                        username: item.song.artist.user.username,
                        nick_name: item.song.artist?.nick_name || null,
                        created_at: item.song.createdAt,
                        release_dat: item.song.release_date,
                        play_count: item.song.play_count
                    }
                )
            )
            return res.status(200).json(
                {
                    status: "success",
                    limit: limit,
                    skip: skip,
                    page: page,
                    total: total,
                    data: simpleData
                }
            )
        } catch (error) {
            console.error("Get favorite music error:", error);
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }
);

// get favorite music detail
/**
 * @swagger
 * /v1/user/favorite/my_favorit_music/{id}:
 *   get:
 *     summary: دریافت جزئیات یک آهنگ خاص از لیست علاقه‌مندی‌ها
 *     description: |
 *       این endpoint برای دریافت اطلاعات کامل یک آهنگ خاص از لیست علاقه‌مندی‌های کاربر جاری استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Favorite
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه رکورد علاقه‌مندی (FavoriteSong ID)
 *         example: 1
 *     responses:
 *       200:
 *         description: اطلاعات آهنگ موردعلاقه با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: شناسه رکورد علاقه‌مندی
 *                       example: 1
 *                     song_id:
 *                       type: integer
 *                       description: شناسه آهنگ
 *                       example: 123
 *                     title:
 *                       type: string
 *                       description: عنوان آهنگ
 *                       example: "آهنگ نمونه"
 *                     audio_path:
 *                       type: string
 *                       description: مسیر فایل صوتی
 *                       example: "/uploads/audio/song123.mp3"
 *                     image_path:
 *                       type: string
 *                       nullable: true
 *                       description: مسیر تصویر آهنگ
 *                       example: "/uploads/images/song123.jpg"
 *                     artist_nick_name:
 *                       type: string
 *                       nullable: true
 *                       description: نام هنری هنرمند
 *                       example: "هنرمند نمونه"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: تاریخ اضافه شدن به علاقه‌مندی‌ها
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: تاریخ آخرین به‌روزرسانی
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: پارامتر ورودی نامعتبر
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
 *                   example: "Invalid favorite music ID"
 *       404:
 *         description: آهنگ موردعلاقه یافت نشد
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
 *                   example: "Favorite music not found"
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
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "server error"
 */
favoriteRouter.get(
    "/my_favorit_music/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const favoriteId = parseInt(req.params.id);

            // Validate favorite ID
            if (isNaN(favoriteId) || favoriteId <= 0) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid favorite music ID"
                });
            }

            const favoritMusicRepository = AppDataSource.getRepository(FavoriteSong);
            
            // Find the favorite music with relations
            const favoriteMusic = await favoritMusicRepository.findOne({
                where: {
                    id: favoriteId,
                    user: { id: userId },
                    is_active: true
                },
                select: {
                    id: true,
                    song: {
                        id: true,
                        title: true,
                        play_count: true,
                        createdAt: true,
                        release_date: true,
                        music_lyrics: true,
                        artist: {
                            nick_name: true,
                            id: true,
                            user: {
                                id: true,
                                username: true,
                                profile: {
                                    id: true,
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        },
                        audio: {
                            audio_file_path: true
                        },
                        image: {
                            image_path: true
                        }
                    }
                },
                relations: {
                    song: {
                        image: true,
                        audio: true,
                        artist: {
                            user: {
                                profile: true
                            }
                        }
                    }
                }
            });

            if (!favoriteMusic) {
                return res.status(404).json({
                    status: false,
                    message: "Favorite music not found"
                });
            }

            // Format response data
            const responseData = {
                id: favoriteMusic.id,
                artist_id: favoriteMusic.song.artist.id,
                song_id: favoriteMusic.song.id,
                title: favoriteMusic.song.title,
                audio_path: favoriteMusic.song.audio.audio_file_path,
                image_path: favoriteMusic.song.image?.image_path || null,
                artist_nick_name: favoriteMusic.song.artist?.nick_name || null,
                first_name: favoriteMusic.song.artist.user.profile?.first_name || null,
                last_name: favoriteMusic.song.artist.user.profile?.last_name || null,
                username: favoriteMusic.song.artist.user.username,
                created_at: favoriteMusic.song.artist?.nick_name || null,
                release_date: favoriteMusic.song.release_date,
                play_count: favoriteMusic.song.play_count,
                music_lyric: favoriteMusic.song.music_lyrics
            };

            return res.status(200).json({
                status: "success",
                data: responseData
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// delete favorite music
/**
 * @swagger
 * /v1/user/favorite/remove_favorite_music/{favorite_music_id}:
 *   delete:
 *     summary: حذف موزیک از لیست علاقه‌مندی‌ها
 *     description: این endpoint برای حذف یک موزیک از لیست علاقه‌مندی‌های کاربر استفاده می‌شود
 *     tags: [Favorite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favorite_music_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه موزیک
 *     responses:
 *       200:
 *         description: موزیک با موفقیت از علاقه‌مندی‌ها حذف شد
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
 *                   example: "successfully removed music from favorites"
 *       404:
 *         description: موزیک در لیست علاقه‌مندی‌ها یافت نشد
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
 *                   example: "music not found in favorites"
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
 *                   example: "server error"
 */
favoriteRouter.delete(
    "/remove_favorite_music/:favorite_music_id/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const favoriteMusicId = parseInt(req.params.favorite_music_id);
            const userId = (req as any).user.user_id;

            const favoriteRepository = AppDataSource.getRepository(FavoriteSong);
            const favortiSong = await favoriteRepository.findOne(
                {
                    where: {
                        song: {id: favoriteMusicId},
                        is_active: true,
                        user: {id: userId}
                    },
                    select: ['id']
                }
            )

            if (!favortiSong) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "favorit song not found"
                    }
                );
            }

            // soft delete favorit song
            favortiSong.is_active = false;
            await favortiSong.save()

            return res.status(200).json({
                status: "success",
                message: "successfully removed music from favorites"
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
