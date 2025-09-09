import {Request, Response, Router} from "express";
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
            // get album id by query params
            const albumRepository = AppDataSource.getRepository(Album);
            const getAlbum = await albumRepository.findOne(
                {
                    where: {id: albumId},
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
                    where: {album: getAlbum, is_active: true},
                    take: limit,
                    skip: skip
                }
            );
            return res.status(200).json(
                {
                    status: "success",
                    data: songs,
                    count: count,
                    page: page
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }

)

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
                    where: {id: userId, is_active: true, is_artist: true},
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
                    where: {id: parseInt(req.params.album_id), is_active: true},
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
            // create music
            const music = new Song();
            music.album = getAlbum;
            music.artist = getArtist;
            music.title = createMusicDto.title;
            music.release_date = new Date(createMusicDto.release_date);
            music.audio = getAudio;
            music.play_count = 0;
            music.music_lyrics = createMusicDto.music_lyrics;
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
      console.error("Delete music error:", error);
      return res.status(500).json({
        status: false,
        message: "server error"
      });
    }
  }
);
