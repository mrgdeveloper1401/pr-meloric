import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Song } from "../../../../entity/Song";
import { Album } from "../../../../entity/Album";
import { User } from "../../../../entity/User";
import { Audio } from "../../../../entity/Audio";
import { plainToClass } from "class-transformer";
import { CreateMusicDto } from "../../../../dtos/music/CreateMusic";
import { validate } from "class-validator";
import { Artist } from "../../../../entity/Artist";
import { UpdateMusicDto } from "../../../../dtos/music/UpdateMusic";
import { Image } from "../../../../entity/Image";
import { FavoriteSong } from "../../../../entity/FavoriteSong";
import { ILike, In, LessThan, Like } from "typeorm";
import { Genre } from "../../../../entity/Genre";
import { Playlist } from "../../../../entity/Playlist";
import { PlaylistSong } from "../../../../entity/PlaylistSong";


export const musicRouter = Router();

// get all song by album
/**
 * @swagger
 * /v1/user/music/{album_id}/songs/:
 *   get:
 *     summary: دریافت لیست آهنگ‌های یک آلبوم
 *     description: |
 *       این endpoint برای دریافت لیست آهنگ‌های یک آلبوم خاص استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: album_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه آلبوم
 *         example: 123
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
 *         description: لیست آهنگ‌های آلبوم با موفقیت بازگردانده شد
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
 *                     $ref: '#/components/schemas/Song'
 *                 count:
 *                   type: integer
 *                   description: تعداد کل آهنگ‌های آلبوم
 *                   example: 15
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی (همیشه 1)
 *                   example: 1
 *       404:
 *         description: آلبوم یافت نشد
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
 *                   example: "album not found"
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
musicRouter.get(
    "/:album_id/songs/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // pagination
            const limit = parseInt(req.query.limit as string) || 20;
            const page = 1;
            const skip = (page - 1) * limit;

            // query params
            const albumId = parseInt(req.params.album_id)
            const date = new Date();
            // get album id by query params
            const albumRepository = AppDataSource.getRepository(Album);
            const getAlbum = await albumRepository.findOne(
                {
                    where: {
                        id: albumId,
                        is_active: true,
                        release_date: LessThan(date)
                    },
                    select: ['id']
                }
            )
            if (!getAlbum) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "album not found"
                    }
                );
            }

            // all songs
            const musicRepository = AppDataSource.getRepository(Song);
            const [songs, count] = await musicRepository.findAndCount(
                {
                    where: { album: getAlbum, is_active: true, release_date: LessThan(date) },
                    take: limit,
                    skip: skip,
                    select: {
                        id: true,
                        title: true,
                        release_date: true,
                        play_count: true,
                        music_lyrics: true,
                        createdAt: true,
                        album: {
                            id: true,
                            title: true,
                            cover_image: {
                                image_path: true
                            }
                        },
                        audio: {
                            audio_file_path: true,
                            audio_format: true
                        },
                        image: {
                            id: true,
                            image_path: true
                        },
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
                        }

                    },
                    relations: {
                        audio: true,
                        image: true,
                        album: {
                            cover_image: true
                        },
                        artist: {
                            cover_image: true,
                            user: {
                                profile: true
                            }
                        }
                    },
                }
            );
            // const simpleData = songs.map(
            //     item => (
            //         {
            //             music_id: item.id,
            //             artist_id: item.artist.id,
            //             nick_name: item.artist?.nick_name || null,
            //             first_name: item.artist.user.profile?.first_name || null,
            //             last_name: item.artist.user.profile?.last_name || null,
            //             username: item.artist.user.username,
            //             title: item.title,
            //             release_date: item.release_date,
            //             created_at: item.createdAt,
            //             play_count: item.play_count,
            //             music_lyrics: item.music_lyrics,
            //             audio_file_path: item.audio.audio_file_path,
            //             music_cover_image: item.image?.image_path || null
            //         }
            //     )
            // )
            const data = songs.map(
                item => (
                    {
                        id: item.id,
                        title: item.title,
                        release_date: item.release_date,
                        play_count: item.play_count,
                        music_lyrics: item.music_lyrics,
                        created_at: item.createdAt,
                        image: {
                            image_path: item.image?.image_path || null,
                        },
                        album: {
                            id: item.album?.id || null,
                            title: item.album?.title || null,
                            cover_image: item.album.cover_image?.image_path || null
                        },
                        artist: {
                            id: item.artist.id,
                            nicke_name: item.artist?.nick_name || null,
                            first_name: item.artist.user.profile?.first_name || null,
                            last_name: item.artist.user.profile?.last_name || null,
                            username: item.artist.user.username,
                            cover_image: {
                                id: item.artist.cover_image?.id || null,
                                image_path: item.artist.cover_image?.image_path || null
                            },
                            audio: {
                                audio_file_path: item.audio.audio_file_path,
                                audio_format: item.audio.audio_format
                            }
                        }
                    }
                )
            )
            return res.status(200).json(
                {
                    status: "success",
                    count: count,
                    page: page,
                    limit: limit,
                    data: data
                }
            )
        } catch (error) {
            console.log(error)
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }

)

// detail music
/**
 * @swagger
 * /v1/user/music/music/{musicId}:
 *   get:
 *     summary: دریافت اطلاعات یک آهنگ
 *     description: |
 *       این endpoint برای دریافت اطلاعات کامل یک آهنگ خاص بر اساس شناسه آن استفاده می‌شود.
 *       آهنگ باید فعال (is_active=true) باشد.
 *     tags:
 *       - Music
 *     parameters:
 *       - in: path
 *         name: musicId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه یکتای آهنگ
 *         example: 1
 *     responses:
 *       200:
 *         description: اطلاعات آهنگ با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: true
 *                   data:
 *                     id: 1
 *                     title: "آهنگ نمونه"
 *                     release_date: "2024-01-15T00:00:00.000Z"
 *                     is_active: true
 *                     play_count: 150
 *                     music_lyrics: "متن آهنگ نمونه..."
 *                     created_at: "2024-01-15T10:30:00.000Z"
 *                     updated_at: "2024-01-20T15:45:00.000Z"
 *                     artist:
 *                       id: 1
 *                       name: "هنرمند نمونه"
 *                     album:
 *                       id: 1
 *                       title: "آلبوم نمونه"
 *                     audio:
 *                       id: 1
 *                       audio_file_path: "/audio/sample.mp3"
 *                     image:
 *                       id: 1
 *                       image_path: "/images/sample.jpg"
 *       404:
 *         description: آهنگ یافت نشد
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
 *             examples:
 *               not_found:
 *                 summary: آهنگ وجود ندارد یا غیرفعال است
 *                 value:
 *                   status: false
 *                   message: "music not found"
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
musicRouter.get(
    "/music/:musicId/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        const musicId = Number(req.params.musicId);
        const date = new Date();

        try {
            const musicRepository = AppDataSource.getRepository(Song);
            const getMusic = await musicRepository.findOne(
                {
                    where: {
                        id: musicId,
                        is_active: true,
                        release_date: LessThan(date)
                    },
                    select: {
                        id: true,
                        title: true,
                        release_date: true,
                        play_count: true,
                        music_lyrics: true,
                        createdAt: true,
                        album: {
                            id: true,
                            title: true,
                            cover_image: {
                                image_path: true
                            }
                        },
                        image: {
                            image_path: true
                        },
                        audio: {
                            audio_file_path: true
                        },
                        artist: {
                            id: true,
                            nick_name: true,
                            user: {
                                id: true,
                                username: true,
                            }
                        }
                    },
                    relations: {
                        album: {
                            cover_image: true
                        },
                        image: true,
                        audio: true,
                        artist: {
                            cover_image: true,
                            user: true
                        }
                    }
                }
            );
            if (!getMusic) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "music not found"
                    }
                )
            }

            const userId = (req as any).user.user_id;
            const FavoriteRepository = AppDataSource.getRepository(FavoriteSong);
            const checkFavoritMusic = await FavoriteRepository.findOne(
                {
                    where: {
                        user: { id: userId },
                        is_active: true,
                        song: { id: musicId }
                    },
                    select: {
                        id: true
                    }
                }
            );
            let isLiked = false;
            if (checkFavoritMusic) {
                isLiked = true
            }

            const likeCount = await FavoriteRepository.count(
                {
                    where: {
                        is_active: true,
                        song: { id: musicId }
                    },
                    select: {
                        id: true
                    }
                }
            );

            // check playlistSong
            const playListRepository = AppDataSource.getRepository(PlaylistSong);
            const checkPlayList = await playListRepository.findOne(
                {
                    where: {
                        is_active: true,
                        song: {id: musicId},
                        playlist: {
                            user: {id: userId},
                            is_active: true
                        }
                        
                    },
                    select: {
                        id: true,
                        playlist: {
                            id: true,
                            is_active: true
                        }
                    },
                    relations: {
                        playlist: true
                    }
                }
            );
            let is_in_playList = false;
            if (checkPlayList) {
                is_in_playList = true;
            }
            const data = {
                id: getMusic.id,
                title: getMusic.title,
                release_date: getMusic.release_date,
                play_count: getMusic.play_count,
                music_lyrics: getMusic.music_lyrics,
                created_at: getMusic.createdAt,
                image: {
                    image_path: getMusic.image?.image_path || null,
                },
                album: {
                    id: getMusic.album.id,
                    title: getMusic.album.title,
                    cover_image: getMusic.album.cover_image?.image_path || null
                },
                artist: {
                    id: getMusic.artist.id,
                    nicke_name: getMusic.artist?.nick_name || null,
                    first_name: getMusic.artist?.first_name || null,
                    last_name: getMusic.artist?.last_name || null,
                    username: getMusic.artist.user.username,
                    cover_image: {
                        id: getMusic.artist.cover_image?.id || null,
                        image_path: getMusic.artist.cover_image?.image_path || null
                    },
                    audio: {
                        isLiked: isLiked,
                        likeCount: likeCount,
                        isInPlayList: is_in_playList,
                        playListId: checkPlayList?.id || null,
                        audio_file_path: getMusic.audio.audio_file_path,
                        audio_format: getMusic.audio.audio_format
                    }
                }
            }
            return res.status(200).json(
                {
                    status: "success",
                    data: data
                }
            );
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


// create song by artist
/**
 * @swagger
 * /v1/user/music/{album_id}/create_music:
 *   post:
 *     summary: ایجاد موسیقی جدید در آلبوم
 *     description: این endpoint برای ایجاد یک موسیقی جدید در آلبوم توسط هنرمند استفاده می‌شود
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: album_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه آلبوم
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - audio_id
 *               - title
 *               - release_date
 *             properties:
 *               audio_id:
 *                 type: integer
 *                 description: شناسه فایل صوتی
 *                 example: 123
 *               title:
 *                 type: string
 *                 description: عنوان موسیقی
 *                 example: "My New Song"
 *               release_date:
 *                 type: string
 *                 format: date
 *                 description: تاریخ انتشار (YYYY-MM-DD)
 *                 example: "2024-01-15"
 *               music_lyrics:
 *                 type: string
 *                 description: متن موزیک
 *                 nullable: true
 *               image_id:
 *                  type: number
 *                  descrption: شناسه عکس
 *                  example: 1
 *     responses:
 *       201:
 *         description: موسیقی با موفقیت ایجاد شد
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
 *                     title:
 *                       type: string
 *                       example: "My New Song"
 *                     id:
 *                       type: integer
 *                       example: 45
 *       400:
 *         description: داده‌های نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       403:
 *         description: دسترسی غیرمجاز - کاربر هنرمند نیست
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: آلبوم، فایل صوتی یا پروفایل هنرمند یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
musicRouter.post(
    "/:album_id/create_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // check req body
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                )
            }
            // check user is artist
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: { id: userId, is_active: true, is_artist: true },
                    select: ["id"]
                }
            );
            if (!getUser) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "permission denied access this"
                    }
                );
            }

            // validate
            const createMusicDto = plainToClass(CreateMusicDto, req.body);
            const errors = await validate(createMusicDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "invalid data",
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

            // check audio
            const audioRepository = AppDataSource.getRepository(Audio);
            const getAudio = await audioRepository.findOne(
                {
                    where: {
                        id: createMusicDto.audio_id,
                        user: {
                            id: userId
                        },
                        is_active: true
                    },
                    select: ['id']
                }
            );
            if (!getAudio) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "audio not found"
                    }
                );
            }

            // check album
            const albumRepository = AppDataSource.getRepository(Album);
            const getAlbum = await albumRepository.findOne(
                {
                    where: { id: parseInt(req.params.album_id), is_active: true },
                    select: ['id']
                }
            )
            if (!getAlbum) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "album not found"
                    }
                );
            }

            // check artist profile
            const artistRepository = AppDataSource.getRepository(Artist);
            const getArtist = await artistRepository.findOne(
                {
                    where: {
                        user: {
                            id: userId
                        },
                        is_active: true
                    },
                    select: ['id']
                }
            )
            if (!getArtist) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "you are not permission this form"
                    }
                );
            }

            // check image
            const imageRepository = AppDataSource.getRepository(Image);
            const getImageId = await imageRepository.findOne(
                {
                    where: { id: createMusicDto.image_id, is_active: true, user: getUser },
                    select: ['id']
                }
            );
            if (!getImageId) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "image not found"
                    }
                )
            }
            // create music
            const music = new Song();
            music.album = getAlbum;
            music.artist = getArtist;
            music.title = createMusicDto.title;
            music.release_date = new Date(createMusicDto.release_date);
            music.audio = getAudio;
            music.play_count = 0;
            music.music_lyrics = createMusicDto.music_lyrics;
            music.image = getImageId;
            await music.save()

            return res.status(201).json(
                {
                    status: "success",
                    data: {
                        title: music.title,
                        id: music.id,
                    }
                }
            );
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

// path update music
// update song by artist
/**
 * @swagger
 * /v1/user/music/{music_id}:
 *   patch:
 *     summary: به‌روزرسانی موسیقی
 *     description: این endpoint برای به‌روزرسانی اطلاعات یک موسیقی توسط هنرمند استفاده می‌شود
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: music_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه موسیقی
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: عنوان موسیقی
 *                 example: "Updated Song Title"
 *                 nullable: true
 *               release_date:
 *                 type: string
 *                 format: date
 *                 description: تاریخ انتشار (YYYY-MM-DD)
 *                 example: "2024-02-20"
 *                 nullable: true
 *               music_lyrics:
 *                 type: string
 *                 description: متن موزیک
 *                 example: "Updated lyrics content..."
 *                 nullable: true
 *               audio_id:
 *                 type: integer
 *                 description: شناسه فایل صوتی جدید
 *                 example: 456
 *                 nullable: true
 *               image_id:
 *                  type: integer
 *                  descrption: شناسه عکس
 *                  example: 1
 *     responses:
 *       200:
 *         description: موسیقی با موفقیت به‌روزرسانی شد
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
 *                       example: 45
 *                     title:
 *                       type: string
 *                       example: "Updated Song Title"
 *                     release_date:
 *                       type: string
 *                       format: date
 *                       example: "2024-02-20"
 *                     music_lyrics:
 *                       type: string
 *                       example: "Updated lyrics content..."
 *       400:
 *         description: داده‌های نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک موسیقی نیست
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: موسیقی یا فایل صوتی یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
musicRouter.patch(
    "/:music_id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const musicId = parseInt(req.params.music_id);

            // Check if music exists and user has permission
            const musicRepository = AppDataSource.getRepository(Song);
            const music = await musicRepository.findOne({
                where: {
                    id: musicId,
                    artist: {
                        user: {
                            id: userId
                        }
                    },
                    is_active: true
                },
                relations: ["artist", "audio"]
            });

            if (!music) {
                return res.status(404).json({
                    status: false,
                    message: "Music not found or you don't have permission to update it"
                });
            }

            // Validate request body
            const updateMusicDto = plainToClass(UpdateMusicDto, req.body);
            const errors = await validate(updateMusicDto);

            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "invalid data",
                    error: errors.map(error => ({
                        field: error.property,
                        constraints: error.constraints
                    }))
                });
            }

            // Check if audio_id is provided and valid
            if (updateMusicDto.audio_id) {
                const audioRepository = AppDataSource.getRepository(Audio);
                const audio = await audioRepository.findOne({
                    where: {
                        id: updateMusicDto.audio_id,
                        user: { id: userId },
                        is_active: true
                    }
                });

                if (!audio) {
                    return res.status(404).json({
                        status: false,
                        message: "Audio file not found or you don't have permission to use it"
                    });
                }
                music.audio = audio;
            }

            // Update fields if provided
            if (updateMusicDto.title !== undefined) {
                music.title = updateMusicDto.title;
            }

            if (updateMusicDto.release_date !== undefined) {
                music.release_date = new Date(updateMusicDto.release_date);
            }

            if (updateMusicDto.music_lyrics !== undefined) {
                music.music_lyrics = updateMusicDto.music_lyrics;
            }

            if (updateMusicDto.image_id !== undefined) {
                const imageRepository = AppDataSource.getRepository(Image);
                const getImage = await imageRepository.findOne(
                    {
                        where: { id: updateMusicDto.image_id, is_active: true, user: { id: userId } },
                        select: ['id']
                    });
                if (!getImage) {
                    return res.status(404).json(
                        {
                            status: false,
                            message: "image not found"
                        }
                    );
                }
                music.image = getImage;
            }

            // Save updated music
            await musicRepository.save(music);

            return res.status(200).json({
                status: "success",
                data: {
                    id: music.id,
                    title: music.title,
                    release_date: music.release_date.toISOString().split('T')[0],
                    music_lyrics: music.music_lyrics
                }
            });

        } catch (error) {
            console.error("Update music error:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// delete (soft delete) song by artist
/**
 * @swagger
 * /v1/user/music/{music_id}:
 *   delete:
 *     summary: حذف موسیقی (غیرفعال کردن)
 *     description: این endpoint برای حذف منطقی موسیقی با تنظیم is_active=false استفاده می‌شود
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: music_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه موسیقی
 *     responses:
 *       200:
 *         description: موسیقی با موفقیت غیرفعال شد
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
 *                   example: "Music deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 45
 *                     title:
 *                       type: string
 *                       example: "My Song"
 *                     is_active:
 *                       type: boolean
 *                       example: false
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک موسیقی نیست
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: موسیقی یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
musicRouter.delete(
    "/:music_id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const musicId = parseInt(req.params.music_id);

            // Check if music exists and user has permission
            const musicRepository = AppDataSource.getRepository(Song);
            const music = await musicRepository.findOne({
                where: {
                    id: musicId,
                    is_active: true,
                    album: {
                        is_active: true
                    },
                    artist: {
                        user: {
                            id: userId
                        }
                    }
                },
                relations: ["artist"]
            });

            if (!music) {
                return res.status(404).json({
                    status: false,
                    message: "Music not found or you don't have permission to delete it"
                });
            }

            //   if (!music.is_active) {
            //     return res.status(400).json({
            //       status: false,
            //       message: "Music is already deleted"
            //     });
            //   }

            music.is_active = false;
            await musicRepository.save(music);

            return res.status(200).json({
                status: "success",
                message: "Music deleted successfully",
                data: {
                    id: music.id,
                    title: music.title,
                    is_active: music.is_active
                }
            });

        } catch (error) {
            // console.error("Delete music error:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// show music by genre id
/**
 * @swagger
 * /v1/user/music/show_music_by_genres:
 *   get:
 *     tags:
 *       - Music
 *     summary: دریافت آهنگ‌های بر اساس لیست ژانرها
 *     description: دریافت لیست آهنگ‌های مرتبط با چندین ژانر با قابلیت صفحه‌بندی
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: genreIds
 *         in: query
 *         required: true
 *         description: لیست آیدی ژانرها (با کاما جدا شده)
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: page
 *         in: query
 *         required: false
 *         description: شماره صفحه
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: تعداد آیتم در هر صفحه
 *         schema:
 *           type: integer
 *           default: 20
 *           example: 20
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedSongsResponse'
 */
musicRouter.get(
    "/show_music_by_genres",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const genreIds = req.query.genreIds as string;
            const limit = Number(req.query.limit) || 20;
            const page = Number(req.query.page) || 1;
            const skip = (page - 1) * limit;
            const date = new Date();

            // convert into array
            const genreIdArray = genreIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            
            if (genreIdArray.length === 0) {
                return res.status(400).json({
                    status: "error",
                    message: "حداقل یک ژانر ID معتبر وارد کنید"
                });
            }

            const musicRepository = AppDataSource.getRepository(Song);
            const genreRepository = AppDataSource.getRepository(Genre);

            const genres = await genreRepository.find({
                where: {
                    id: In(genreIdArray)
                },
                select: ["id", "name"]
            });

            const genreMap = new Map();
            genres.forEach(genre => {
                genreMap.set(genre.id, genre.name);
            });

            // query builder
            const queryBuilder = musicRepository
                .createQueryBuilder("song")
                .leftJoinAndSelect("song.audio", "audio")
                .leftJoinAndSelect("song.album", "album")
                .leftJoinAndSelect("song.image", "image")
                .leftJoinAndSelect("song.artist", "artist")
                .leftJoinAndSelect("artist.cover_image", "artist_cover_image")
                .leftJoinAndSelect("artist.user", "user")
                .leftJoinAndSelect("user.profile", "profile")
                .leftJoinAndSelect("album.cover_image", "album_cover_image")
                .leftJoinAndSelect("album.genre", "genre")
                .where("song.is_active = :isActive", { isActive: true })
                .andWhere("song.release_date < :currentDate", { currentDate: date })
                .andWhere("album.is_active = :albumIsActive", { albumIsActive: true })
                .andWhere("album.release_date < :albumReleaseDate", { albumReleaseDate: date })
                .andWhere("genre.id IN (:...genreIds)", { genreIds: genreIdArray })
                .orderBy("song.release_date", "DESC")
                .skip(skip)
                .take(limit);

            const [musics, total] = await queryBuilder.getManyAndCount();

            const data = musics.map(item => ({
                id: item.id,
                title: item.title,
                release_date: item.release_date,
                play_count: item.play_count,
                music_lyrics: item.music_lyrics,
                created_at: item.createdAt,
                image: {
                    image_path: item.image?.image_path || null,
                },
                album: {
                    id: item.album?.id || null,
                    title: item.album?.title || null,
                    cover_image: item.album?.cover_image?.image_path || null,
                    genre: {
                        id: item.album?.genre?.id || null,
                        name: item.album?.genre?.name || null
                    }
                },
                artist: {
                    id: item.artist.id,
                    nick_name: item.artist?.nick_name || null,
                    first_name: item.artist.user?.profile?.first_name || null,
                    last_name: item.artist.user?.profile?.last_name || null,
                    username: item.artist.user?.username || null,
                    cover_image: {
                        id: item.artist.cover_image?.id || null,
                        image_path: item.artist.cover_image?.image_path || null
                    }
                },
                audio: {
                    audio_file_path: item.audio?.audio_file_path || null,
                    audio_format: item.audio?.audio_format || null
                }
            }));

            const genresWithNames = genreIdArray.map(id => ({
                id: id,
                name: genreMap.get(id) || "نامشخص"
            }));

            return res.status(200).json({
                status: "success",
                total: total,
                page: page,
                skip: skip,
                limit: limit,
                genres: genresWithNames,
                data: data
            });

        } catch (error) {
            return res.status(500).json({
                status: "error",
                message: "Internal server error"
            });
        }
    }
);

// show music by genre id
/**
 * @swagger
 * /v1/user/music/show_music_by_genres:
 *   get:
 *     tags:
 *       - Music
 *     summary: دریافت آهنگ‌های بر اساس لیست ژانرها
 *     description: دریافت لیست آهنگ‌های مرتبط با چندین ژانر با قابلیت صفحه‌بندی
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: genreIds
 *         in: query
 *         required: true
 *         description: لیست آیدی ژانرها (با کاما جدا شده)
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: page
 *         in: query
 *         required: false
 *         description: شماره صفحه
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: تعداد آیتم در هر صفحه
 *         schema:
 *           type: integer
 *           default: 20
 *           example: 20
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 skip:
 *                   type: integer
 *                   example: 0
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 genres:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "پاپ"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "آهنگ زیبا"
 *                       release_date:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-28T11:57:16.000Z"
 *                       play_count:
 *                         type: integer
 *                         example: 150
 *                       music_lyrics:
 *                         type: string
 *                         nullable: true
 *                         example: "متن آهنگ..."
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-28T05:10:19.604Z"
 *                       image:
 *                         type: object
 *                         properties:
 *                           image_path:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/image.jpg"
 *                       album:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "آلبوم تست"
 *                           cover_image:
 *                             type: string
 *                             nullable: true
 *                             example: "https://example.com/cover.jpg"
 *                           genre:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               name:
 *                                 type: string
 *                                 example: "پاپ"
 *                       artist:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nick_name:
 *                             type: string
 *                             nullable: true
 *                             example: "خواننده"
 *                           first_name:
 *                             type: string
 *                             nullable: true
 *                             example: "جان"
 *                           last_name:
 *                             type: string
 *                             nullable: true
 *                             example: "دو"
 *                           username:
 *                             type: string
 *                             example: "john_doe"
 *                           cover_image:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 nullable: true
 *                                 example: 1
 *                               image_path:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "https://example.com/artist-cover.jpg"
 *                       audio:
 *                         type: object
 *                         properties:
 *                           audio_file_path:
 *                             type: string
 *                             example: "https://example.com/audio.mp3"
 *                           audio_format:
 *                             type: string
 *                             example: "mp3"
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده یا منقضی شده است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: ژانر مورد نظر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
musicRouter.get(
    "/show_music_by_genres",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const genreIds = req.query.genreIds as string;
            const limit = Number(req.query.limit) || 20;
            const page = Number(req.query.page) || 1;
            const skip = (page - 1) * limit;
            const date = new Date();

            // convert into array
            const genreIdArray = genreIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            
            if (genreIdArray.length === 0) {
                return res.status(400).json({
                    status: "error",
                    message: "حداقل یک ژانر ID معتبر وارد کنید"
                });
            }

            const musicRepository = AppDataSource.getRepository(Song);
            const genreRepository = AppDataSource.getRepository(Genre);

            // دریافت اطلاعات ژانرها
            const genres = await genreRepository.find({
                where: {
                    id: In(genreIdArray)
                },
                select: ["id", "name"]
            });

            const genreMap = new Map();
            genres.forEach(genre => {
                genreMap.set(genre.id, genre.name);
            });

            // query builder با select مشخص
            const queryBuilder = musicRepository
                .createQueryBuilder("song")
                .leftJoinAndSelect("song.audio", "audio")
                .leftJoinAndSelect("song.album", "album")
                .leftJoinAndSelect("song.image", "image")
                .leftJoinAndSelect("song.artist", "artist")
                .leftJoinAndSelect("artist.cover_image", "artist_cover_image")
                .leftJoinAndSelect("artist.user", "user")
                .leftJoinAndSelect("user.profile", "profile")
                .leftJoinAndSelect("album.cover_image", "album_cover_image")
                .leftJoinAndSelect("album.genre", "genre")
                .select([
                    //  song
                    "song.id",
                    "song.title",
                    "song.release_date",
                    "song.play_count",
                    "song.music_lyrics",
                    "song.createdAt",
                    
                    //  audio
                    "audio.audio_file_path",
                    "audio.audio_format",
                    
                    //  image
                    "image.image_path",
                    
                    //  album
                    "album.id",
                    "album.title",
                    
                    //  album cover image
                    "album_cover_image.image_path",
                    
                    //  genre
                    "genre.id",
                    "genre.name",
                    
                    //  artist
                    "artist.id",
                    "artist.nick_name",
                    "artist.first_name",
                    "artist.last_name",
                    
                    //  artist cover image
                    "artist_cover_image.id",
                    "artist_cover_image.image_path",
                    
                    //  user
                    "user.username",
                    
                ])
                .where("song.is_active = :isActive", { isActive: true })
                .andWhere("song.release_date < :currentDate", { currentDate: date })
                .andWhere("album.is_active = :albumIsActive", { albumIsActive: true })
                .andWhere("album.release_date < :albumReleaseDate", { albumReleaseDate: date })
                .andWhere("genre.id IN (:...genreIds)", { genreIds: genreIdArray })
                .orderBy("song.release_date", "DESC")
                .skip(skip)
                .take(limit);

            const [musics, total] = await queryBuilder.getManyAndCount();

            const data = musics.map(item => ({
                id: item.id,
                title: item.title,
                release_date: item.release_date,
                play_count: item.play_count,
                music_lyrics: item.music_lyrics,
                created_at: item.createdAt,
                image: {
                    image_path: item.image?.image_path || null,
                },
                album: {
                    id: item.album?.id || null,
                    title: item.album?.title || null,
                    cover_image: item.album?.cover_image?.image_path || null,
                    genre: {
                        id: item.album?.genre?.id || null,
                        name: item.album?.genre?.name || null
                    }
                },
                artist: {
                    id: item.artist.id,
                    nick_name: item.artist?.nick_name || null,
                    first_name: item.artist.user?.profile?.first_name || null,
                    last_name: item.artist.user?.profile?.last_name || null,
                    username: item.artist.user?.username || null,
                    cover_image: {
                        id: item.artist.cover_image?.id || null,
                        image_path: item.artist.cover_image?.image_path || null
                    }
                },
                audio: {
                    audio_file_path: item.audio?.audio_file_path || null,
                    audio_format: item.audio?.audio_format || null
                }
            }));

            // ساخت آرایه ژانرها با نام
            const genresWithNames = genreIdArray.map(id => ({
                id: id,
                name: genreMap.get(id) || "نامشخص"
            }));

            return res.status(200).json({
                status: "success",
                total: total,
                page: page,
                skip: skip,
                limit: limit,
                genres: genresWithNames,
                data: data
            });

        } catch (error) {
            console.error("Error in show_music_by_genres:", error);
            return res.status(500).json({
                status: "error",
                message: "Internal server error"
            });
        }
    }
);

// get music by artist_id
/**
 * @swagger
 * components:
 *   schemas:
 *     PaginationParams:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           description: شماره صفحه
 *           example: 1
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           description: تعداد آیتم در هر صفحه
 *           example: 20
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 150
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         totalPages:
 *           type: integer
 *           example: 8
 *         hasNext:
 *           type: boolean
 *           example: true
 *         hasPrev:
 *           type: boolean
 *           example: false
 *     MusicItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Song Title"
 *         artist_nick_name:
 *           type: string
 *           nullable: true
 *           example: "Super Artist"
 *         artist_first_name:
 *           type: string
 *           nullable: true
 *           example: "John"
 *         artist_last_name:
 *           type: string
 *           nullable: true
 *           example: "Doe"
 *         release_date:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T00:00:00.000Z"
 *         play_count:
 *           type: integer
 *           example: 1500
 *         audio_file_path:
 *           type: string
 *           example: "/uploads/audio/song.mp3"
 *         image_path:
 *           type: string
 *           nullable: true
 *           example: "/uploads/images/cover.jpg"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-16T14:20:00.000Z"
 *     MusicListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MusicItem'
 *         pagination:
 *           $ref: '#/components/schemas/PaginationResponse'
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *   parameters:
 *     ArtistIdParam:
 *       name: artistId
 *       in: path
 *       required: true
 *       description: آیدی آرتیست
 *       schema:
 *         type: integer
 *         example: 1
 *     PageQueryParam:
 *       name: page
 *       in: query
 *       required: false
 *       description: شماره صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *     LimitQueryParam:
 *       name: limit
 *       in: query
 *       required: false
 *       description: تعداد آیتم در هر صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /v1/user/music/{artistId}/musics:
 *   get:
 *     tags:
 *       - Music
 *     summary: دریافت لیست موزیک‌های یک آرتیست
 *     description: |
 *       دریافت لیست تمام موزیک‌های فعال یک آرتیست خاص به همراه اطلاعات پجینیشن و فیلترهای مرتب‌سازی
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - فقط موزیک‌های فعال (is_active=true) برگردانده می‌شوند
 *       - آرتیست نیز باید فعال باشد
 *       
 *       **پارامترهای مرتب‌سازی:**
 *       - `sort_by`: فیلد برای مرتب‌سازی (مقدار پیش‌فرض: `created_at`)
 *         - مقادیر مجاز: `created_at`, `play_count`, `release_date`, `title`
 *       - `sort_order`: ترتیب مرتب‌سازی (مقدار پیش‌فرض: `desc`)
 *         - مقادیر مجاز: `asc` (صعودی), `desc` (نزولی)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ArtistIdParam'
 *       - $ref: '#/components/parameters/PageQueryParam'
 *       - $ref: '#/components/parameters/LimitQueryParam'
 *       - name: sort_by
 *         in: query
 *         description: فیلد برای مرتب‌سازی
 *         schema:
 *           type: string
 *           enum: [created_at, play_count, release_date, title]
 *           default: created_at
 *       - name: sort_order
 *         in: query
 *         description: ترتیب مرتب‌سازی
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست موزیک‌ها بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MusicListResponse'
 */
musicRouter.get(
    "/:artistId/musics",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const artistId = Number(req.params.artistId);
            const page = Math.max(1, Number(req.query.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
            const skip = (page - 1) * limit;
            
            // پارامترهای مرتب‌سازی جدید
            const sortBy = (req.query.sort_by as string) || 'created_at';
            const sortOrder = (req.query.sort_order as string) || 'desc';

            // Validation
            if (isNaN(artistId)) {
                return res.status(400).json({
                    status: false,
                    message: "artist_id must be a valid number"
                });
            }

            // اعتبارسنجی پارامترهای مرتب‌سازی
            const validSortFields = ['created_at', 'play_count', 'release_date', 'title', 'like_quantity'];
            const validSortOrders = ['asc', 'desc'];
            
            if (!validSortFields.includes(sortBy)) {
                return res.status(400).json({
                    status: false,
                    message: `Invalid sort_by parameter. Valid values: ${validSortFields.join(', ')}`
                });
            }

            if (!validSortOrders.includes(sortOrder)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid sort_order parameter. Valid values: asc, desc"
                });
            }

            // Check if artist exists and is active
            const artistRepository = AppDataSource.getRepository(Artist);
            const artist = await artistRepository.findOne({
                where: {
                    id: artistId,
                    is_active: true
                },
                select: ["id"]
            });

            if (!artist) {
                return res.status(404).json({
                    status: false,
                    message: "Artist not found or inactive"
                });
            }

            // تعیین فیلد مرتب‌سازی برای TypeORM
            let orderField = '';
            switch (sortBy) {
                case 'created_at':
                    orderField = 'createdAt';
                    break;
                case 'play_count':
                    orderField = 'play_count';
                    break;
                case 'release_date':
                    orderField = 'release_date';
                    break;
                case 'title':
                    orderField = 'title';
                    break;
                case 'like_quantity':
                    orderField = 'like_quantity';
                    break;
                default:
                    orderField = 'createdAt';
            }

            // Get musics with pagination and sorting
            const date = new Date();
            const musicRepository = AppDataSource.getRepository(Song);
            const [musics, total] = await musicRepository.findAndCount({
                where: {
                    is_active: true,
                    artist: { id: artistId },
                    release_date: LessThan(date),
                },
                relations: {
                    image: true,
                    audio: true,
                    album: {
                        cover_image: true
                    },
                    artist: {
                        cover_image: true,
                        user: {
                            profile: true
                        }
                    }
                },
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    title: true,
                    release_date: true,
                    play_count: true,
                    music_lyrics: true,
                    audio: {
                        audio_file_path: true,
                        audio_format: true
                    },
                    image: {
                        image_path: true
                    },
                    album: {
                        id: true,
                        title: true,
                        cover_image: {
                            image_path: true
                        }
                    },
                    artist: {
                        id: true,
                        nick_name: true,
                        cover_image: {
                            id: true,
                            image_path: true
                        },
                        user: {
                            username: true,
                            id: true,
                            profile: {
                                id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                order: { [orderField]: sortOrder.toUpperCase() as "ASC" | "DESC" },
                skip,
                take: limit
            });

            // Transform data
            const data = musics.map(item => ({
                id: item.id,
                title: item.title,
                release_date: item.release_date,
                play_count: item.play_count,
                music_lyrics: item.music_lyrics,
                created_at: item.createdAt,
                image: {
                    image_path: item.image?.image_path || null,
                },
                album: {
                    id: item.album?.id || null,
                    title: item.album?.title || null,
                    cover_image: item.album?.cover_image?.image_path || null
                },
                artist: {
                    id: item.artist.id,
                    nick_name: item.artist?.nick_name || null,
                    first_name: item.artist.user.profile?.first_name || null,
                    last_name: item.artist.user.profile?.last_name || null,
                    username: item.artist.user.username,
                    cover_image: {
                        id: item.artist.cover_image?.id || null,
                        image_path: item.artist.cover_image?.image_path || null
                    }
                },
                audio: {
                    audio_file_path: item.audio?.audio_file_path,
                    audio_format: item.audio?.audio_format
                }
            }));

            // Pagination info
            const totalPages = Math.ceil(total / limit);
            const pagination = {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                sort_by: sortBy,
                sort_order: sortOrder
            };

            return res.status(200).json({
                status: "success",
                data: data,
                pagination
            });

        } catch (error) {
            console.error("Error in artist musics route:", error);
            return res.status(500).json({
                status: false,
                message: "Internal server error"
            });
        }
    }
);

// get album by artist_id
/**
 * @swagger
 * /v1/user/music/album/{artistId}/albums:
 *   get:
 *     tags:
 *       - Albums
 *     summary: دریافت لیست آلبوم‌های یک آرتیست
 *     description: |
 *       دریافت لیست تمام آلبوم‌های فعال یک آرتیست خاص با قابلیت صفحه‌بندی
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - فقط آلبوم‌های فعال (is_active=true) نمایش داده می‌شوند
 *       - اطلاعات کامل کاور آلبوم و اطلاعات کاربر مرتبط برگردانده می‌شود
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ArtistIdParam'
 *       - $ref: '#/components/parameters/PageQueryParam'
 *       - $ref: '#/components/parameters/LimitQueryParam'
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست آلبوم‌های آرتیست بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlbumListResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   limit: 20
 *                   page: 1
 *                   total: 5
 *                   data:
 *                     - id: 1
 *                       title: "آلبوم بهترین آثار"
 *                       createdAt: "2024-01-15T10:30:00.000Z"
 *                       updatedAt: "2024-01-16T14:20:00.000Z"
 *                       image_path: "https://example.com/images/album1-cover.jpg"
 *                       artist_first_name: "john"
 *                       artist_last_name: "deo"
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_artist_id:
 *                 summary: artistId نامعتبر
 *                 value:
 *                   status: false
 *                   message: "artistId must be required"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: آرتیست پیدا نشد یا هیچ آلبوم فعالی ندارد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
musicRouter.get(
    "/album/:artistId/albums",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const artistId = Number(req.params.artistId)
            const limit = Number(req.query.limit) || 20;
            const page = Number(req.query.page) || 1;
            const skip = (page - 1) * limit;
            const date = new Date();
            if (isNaN(artistId)) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "artistId must be required"
                    }
                );
            }

            const albumRepository = AppDataSource.getRepository(Album);
            const [albums, total] = await albumRepository.findAndCount(
                {
                    where: {
                        id: artistId,
                        is_active: true,
                        release_date: LessThan(date)
                    },
                    relations: {
                        user: {
                            profile: true,
                            user_artist_set: true
                        },
                        cover_image: true,
                    },
                    select: {
                        id: true,
                        title: true,
                        createdAt: true,
                        updatedAt: true,
                        cover_image: {
                            image_path: true
                        },
                        user: {
                            user_artist_set: {
                                id: true
                            },
                            id: true,
                            profile: {
                                id: true,
                                first_name: true,
                                last_name: true
                            }
                        }
                    },
                    take: limit,
                    skip: skip
                }
            );

            const simpleData = albums.map(
                item => (
                    {
                        id: item.id,
                        artist_id: item.user.user_artist_set.id,
                        created_at: item.createdAt,
                        updated_at: item.updatedAt,
                        title: item.title,
                        image_path: item.cover_image?.image_path || null,
                        artist_first_name: item.user.profile?.first_name || null,
                        artist_last_name: item.user.profile?.last_name || null
                    }
                )
            )
            return res.status(200).json(
                {
                    status: "success",
                    limit: limit,
                    page: page,
                    total: total,
                    data: simpleData
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

// search music by title
/**
 * @swagger
 * tags:
 *   name: Music
 *   description: Music management and search APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MusicSearchResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "success"
 *         count:
 *           type: integer
 *           example: 150
 *         limit:
 *           type: integer
 *           example: 20
 *         page:
 *           type: integer
 *           example: 1
 *         date:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Love Story"
 *               release_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-01-15T00:00:00.000Z"
 *               play_count:
 *                 type: integer
 *                 example: 1500
 *               music_lyrics:
 *                 type: string
 *                 nullable: true
 *                 example: "This is the lyrics of the song..."
 *               created_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2023-01-15T10:30:00.000Z"
 *               image:
 *                 type: object
 *                 properties:
 *                   image_path:
 *                     type: string
 *                     nullable: true
 *                     example: "/images/song1.jpg"
 *               album:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   title:
 *                     type: string
 *                     example: "Best Hits"
 *                   cover_image:
 *                     type: string
 *                     nullable: true
 *                     example: "/images/album1.jpg"
 *               artist:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   nicke_name:
 *                     type: string
 *                     nullable: true
 *                     example: "Super Artist"
 *                   first_name:
 *                     type: string
 *                     nullable: true
 *                     example: "John"
 *                   last_name:
 *                     type: string
 *                     nullable: true
 *                     example: "Doe"
 *                   username:
 *                     type: string
 *                     example: "johndoe"
 *                   cover_image:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         nullable: true
 *                         example: 1
 *                       image_path:
 *                         type: string
 *                         nullable: true
 *                         example: "/images/artist1.jpg"
 *                   audio:
 *                     type: object
 *                     properties:
 *                       audio_file_path:
 *                         type: string
 *                         example: "/audio/song1.mp3"
 *                       audio_format:
 *                         type: string
 *                         example: "mp3"
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 * 
 *   parameters:
 *     TitleQueryParam:
 *       in: query
 *       name: title
 *       required: true
 *       schema:
 *         type: string
 *         minLength: 1
 *       description: "Search query for song title"
 *       example: "love"
 * 
 *     PageQueryParam:
 *       in: query
 *       name: page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       description: "Page number for pagination"
 * 
 *     LimitQueryParam:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 20
 *       description: "Number of items per page (max 100)"
 */

/**
 * @swagger
 * /v1/user/music/search:
 *   get:
 *     summary: Search songs by title
 *     description: |
 *       Search for songs by title with pagination support.
 *       Returns active songs that match the search criteria.
 *     tags:
 *       - Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TitleQueryParam'
 *       - $ref: '#/components/parameters/PageQueryParam'
 *       - $ref: '#/components/parameters/LimitQueryParam'
 *     responses:
 *       200:
 *         description: Successful search operation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "success"
 *                 count:
 *                   type: integer
 *                   example: 150
 *                 limit:
 *                   type: integer
 *                   example: 20
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 date:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MusicSearchResponse/properties/date/items'
 *             examples:
 *               success:
 *                 summary: Successful search results
 *                 value:
 *                   message: "success"
 *                   count: 150
 *                   limit: 20
 *                   page: 1
 *                   date:
 *                     - id: 1
 *                       title: "Love Story"
 *                       release_date: "2023-01-15T00:00:00.000Z"
 *                       play_count: 1500
 *                       music_lyrics: "This is the lyrics of the song..."
 *                       created_at: "2023-01-15T10:30:00.000Z"
 *                       image:
 *                         image_path: "/images/song1.jpg"
 *                       album:
 *                         id: 1
 *                         title: "Best Hits"
 *                         cover_image: "/images/album1.jpg"
 *                       artist:
 *                         id: 1
 *                         nicke_name: "Super Artist"
 *                         first_name: "John"
 *                         last_name: "Doe"
 *                         username: "johndoe"
 *                         cover_image:
 *                           id: 1
 *                           image_path: "/images/artist1.jpg"
 *                         audio:
 *                           audio_file_path: "/audio/song1.mp3"
 *                           audio_format: "mp3"
 * 
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missingTitle:
 *                 summary: Missing title parameter
 *                 value:
 *                   status: false
 *                   message: "title params is required"
 * 
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: Unauthorized access
 *                 value:
 *                   status: false
 *                   message: "Authentication token is required"
 * 
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 summary: Internal server error
 *                 value:
 *                   status: false
 *                   message: "server error"
 */
musicRouter.get(
    "/search",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // params
            const limit = Number(req.query.limit) || 20;
            const page = Number((req.query.page)) || 1;
            const skip = (page - 1) * limit;
            const title = (req.query.title) || null;

            // validation title
            if (!title) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "title params is required"
                    }
                )
            }
            // song
            const date = new Date();
            const MusicListResponse = AppDataSource.getRepository(Song);
            const [findMusics, count] = await MusicListResponse.findAndCount(
                {
                    where: {
                        title: ILike(`%${title}%`),
                        is_active: true,
                        release_date: LessThan(date),
                        album: {
                            is_active: true,
                            release_date: LessThan(date)
                        }
                    },
                    select: {
                        id: true,
                        title: true,
                        release_date: true,
                        play_count: true,
                        music_lyrics: true,
                        createdAt: true,
                        album: {
                            id: true,
                            title: true,
                            cover_image: {
                                image_path: true
                            }
                        },
                        audio: {
                            audio_file_path: true,
                            audio_format: true
                        },
                        image: {
                            id: true,
                            image_path: true
                        },
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
                        }

                    },
                    relations: {
                        audio: true,
                        image: true,
                        album: {
                            cover_image: true
                        },
                        artist: {
                            cover_image: true,
                            user: {
                                profile: true
                            }
                        }
                    },
                    take: limit,
                    skip: skip
                }
            )
            const data = findMusics.map(
                item => (
                    {
                        id: item.id,
                        title: item.title,
                        release_date: item.release_date,
                        play_count: item.play_count,
                        music_lyrics: item.music_lyrics,
                        created_at: item.createdAt,
                        image: {
                            image_path: item.image?.image_path || null,
                        },
                        album: {
                            id: item.album?.id || null,
                            title: item.album?.title || null,
                            cover_image: item.album.cover_image?.image_path || null
                        },
                        artist: {
                            id: item.artist.id,
                            nicke_name: item.artist?.nick_name || null,
                            first_name: item.artist.user.profile?.first_name || null,
                            last_name: item.artist.user.profile?.last_name || null,
                            username: item.artist.user.username,
                            cover_image: {
                                id: item.artist.cover_image?.id || null,
                                image_path: item.artist.cover_image?.image_path || null
                            },
                            audio: {
                                audio_file_path: item.audio.audio_file_path,
                                audio_format: item.audio.audio_format
                            }
                        }
                    }
                )
            )
            return res.status(200).json(
                {
                    message: "success",
                    // title: title,
                    count: count,
                    limit: limit,
                    page: page,
                    date: data
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
    })


// increemt play count
/**
 * @swagger
 * /v1/user/music/increement_play_count/{musicId}:
 *   post:
 *     summary: Increment play count for a song
 *     description: |
 *       Increases the play count of a specific song by 1.
 *       Only works for active songs that have been released.
 *     tags:
 *       - Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: musicId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Numeric ID of the music
 *         example: 123
 *     responses:
 *       200:
 *         description: Play count successfully incremented
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
 *                   example: "successfully increment music"
 *             examples:
 *               success:
 *                 summary: Play count incremented
 *                 value:
 *                   status: "success"
 *                   message: "successfully increment music"
 * 
 *       400:
 *         description: Invalid music ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidId:
 *                 summary: Invalid music ID
 *                 value:
 *                   status: false
 *                   message: "music id not be null"
 * 
 *       404:
 *         description: Music not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 summary: Music not found
 *                 value:
 *                   status: false
 *                   message: "music not found"
 * 
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

musicRouter.post(
    "/increement_play_count/:musicId",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const musicId = Number(req.params.musicId);
            if (isNaN(musicId)) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "music id not be null"
                    }
                )
            }
            
            const date = new Date();
            const musicRepository = AppDataSource.getRepository(Song);
            const music = await musicRepository.findOne(
                {
                    where: {
                        id: musicId,
                        is_active: true,
                        release_date: LessThan(date),
                        album: {
                            is_active: true,
                            release_date: LessThan(date)
                        }
                    },
                    select: {
                        id: true,
                        play_count: true
                    }
                }
            )
            
            if (!music) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "music not found"
                    }
                )
            }

            music.play_count += 1;
            await music.save()

            return res.status(200).json(
                {
                    status: "success",
                    message: "successfully increment music"
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