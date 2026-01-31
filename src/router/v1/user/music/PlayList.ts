import { Router, Request, Response } from "express";
import {
  authenticateJWT,
} from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Playlist } from "../../../../entity/Playlist";
import { plainToClass } from "class-transformer";
import { CreatePLayListDto } from "../../../../dtos/music/PlayListDto";
import { validate } from "class-validator";
import { User } from "../../../../entity/User";
import { PlaylistSong } from "../../../../entity/PlaylistSong";
import { Song } from "../../../../entity/Song";

export const playListRouter = Router();


// // get all playlist
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
      const [allPlayList, total] = await playListRepository.findAndCount({
        where: {
          user: {
            id: userId,
          },
          is_active: true,
        },
        take: limit,
        skip: skip,
        select: ["id", "title", "description"],
      });

      return res.status(200).json({
        status: "success",
        page: page,
        limit: limit,
        skip: skip,
        total: total,
        data: allPlayList,
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


// // create playlist
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
  async (req: Request, res: Response) => {
    try {
      // get user id
      const userId = (req as any).user.user_id;

      // check req body
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      // dto
      const playListDto = plainToClass(CreatePLayListDto, req.body);
      const errors = await validate(playListDto);

      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }
      // create playlist
      const playList = new Playlist();
      playList.user = { id: Number(userId) } as User;
      playList.title = playListDto.title;
      playList.description = playListDto.description;
      await playList.save();

      return res.status(201).json({
        status: "success",
        data: {
          id: playList.id,
          title: playList.title,
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


// delete playlist
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
          message: "Invalid playlist ID",
        });
      }

      const playListRepository = AppDataSource.getRepository(Playlist);

      // find playlist
      const playList = await playListRepository.findOne({
        where: { id: playListId, is_active: true, user: { id: userId } },
        select: ["id"],
      });

      if (!playList) {
        return res.status(404).json({
          status: false,
          message: "Playlist not found",
        });
      }

      // delete playlist
      playList.is_active = false;
      await playListRepository.save(playList);

      return res.status(200).json({
        status: true,
        message: "Playlist deleted successfully",
      });
    } catch (error) {
      console.error("Delete playlist error:", error);
      return res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
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
          message: "Invalid playlist ID",
        });
      }

      // check request body
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "Request body is required",
        });
      }

      const playListRepository = AppDataSource.getRepository(Playlist);

      // find playlist
      const playList = await playListRepository.findOne({
        where: { id: playListId, is_active: true },
        relations: ["user"],
      });
      if (!playList) {
        return res.status(404).json({
          status: false,
          message: "Playlist not found",
        });
      }

      // check ownwer playlist
      if (playList.user.id !== Number(userId)) {
        return res.status(403).json({
          status: false,
          message: "You don't have permission to update this playlist",
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
          is_active: playList.is_active,
        },
      });
    } catch (error) {
      console.error("Update playlist error:", error);
      return res.status(500).json({
        status: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
);


// show music by playlist
/**
 * @swagger
 * /v1/user/play_list/my_play_list/{id}/musics/:
 *   get:
 *     summary: دریافت آهنگ‌های یک پلی‌لیست
 *     description: |
 *       این endpoint برای دریافت لیست آهنگ‌های یک پلی‌لیست خاص کاربر جاری با قابلیت صفحه‌بندی استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد و کاربر فقط می‌تواند پلی‌لیست‌های خودش را مشاهده کند.
 *     tags:
 *       - Playlists
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه یکتای پلی‌لیست
 *         example: 1
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
 *         description: لیست آهنگ‌های پلی‌لیست با موفقیت بازگردانده شد
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
 *                   description: تعداد کل آهنگ‌های پلی‌لیست
 *                   example: 15
 *                 totalPages:
 *                   type: integer
 *                   description: تعداد کل صفحات
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       play_list_id:
 *                         type: integer
 *                         example: 1
 *                       playlist_title:
 *                         type: string
 *                         example: play list one
 *                       song_id:
 *                         type: integer
 *                         example: 123
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       release_data:
 *                         type: string
 *                         format: date
 *                       title:
 *                         type: string
 *                         example: "آهنگ نمونه ۱"
 *                       audio_path:
 *                         type: string
 *                         format: uri
 *                         example: "https://example.com/audio/song1.mp3"
 *                       image_path:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                         example: "https://example.com/images/song1.jpg"
 *                       artist_id:
 *                         type: integer
 *                         example: 1
 *                       album_title:
 *                         type: string
 *                         nullable: true
 *                         example: "آلبوم نمونه"
 *                       artist_first_name:
 *                         type: string
 *                         nullable: true
 *                         example: "جان"
 *                       artist_last_name:
 *                         type: string
 *                         nullable: true
 *                         example: "داویی"
 *                       username:
 *                         type: string
 *                         example: "johndoe"
 *                       release_date:
 *                         type: string
 *                         format: date
 *                       play_count:
 *                         type: integer
 *                         example: 150
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   limit: 20
 *                   skip: 0
 *                   page: 1
 *                   total: 15
 *                   totalPages: 1
 *                   data:
 *                     - play_list_id: 1
 *                       song_id: 123
 *                       created_at: "2023-01-15T10:30:00.000Z"
 *                       release_data: "2023-01-01"
 *                       title: "آهنگ نمونه ۱"
 *                       audio_path: "https://example.com/audio/song1.mp3"
 *                       image_path: "https://example.com/images/song1.jpg"
 *                       artist_id: 1
 *                       album_title: "آلبوم نمونه"
 *                       artist_first_name: "جان"
 *                       artist_last_name: "داویی"
 *                       username: "johndoe"
 *                       release_date: "2023-01-01"
 *                       play_count: 150
 *       400:
 *         description: پارامترهای ورودی نامعتبر
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
 *             examples:
 *               invalid_id:
 *                 summary: شناسه پلی‌لیست نامعتبر
 *                 value:
 *                   status: false
 *                   message: "Playlist ID must be a valid positive number"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک پلی‌لیست نیست
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
 *                   example: "Access denied to this playlist"
 *       404:
 *         description: پلی‌لیست یافت نشد
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
 *                   example: "Playlist not found or you don't have access"
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
 *                   example: "Internal server error"
 */
playListRouter.get(
  "/my_play_list/:id/musics/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const playlistId = Number(req.params.id);
      const userId = (req as any).user.user_id;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const page = Number(req.query.page) || 1;
      const skip = (page - 1) * limit;

      // Validate playlist ID
      if (!playlistId || isNaN(playlistId) || playlistId < 1) {
        return res.status(400).json({
          status: false,
          message: "Playlist ID must be a valid positive number"
        });
      }

      // 1. First check if playlist exists and user has access
      const playlistRepository = AppDataSource.getRepository(Playlist);
      const playlist = await playlistRepository.findOne({
        where: {
          id: playlistId,
          is_active: true,
          user: { id: userId }
        },
        select: {
          id: true
        }
      });

      if (!playlist) {
        return res.status(404).json({
          status: false,
          message: "Playlist not found or you don't have access"
        });
      }

      // 2. Main query for playlist songs
      const playListSongRepository = AppDataSource.getRepository(PlaylistSong);

      const queryBuilder = playListSongRepository
        .createQueryBuilder("play_list_song")
        .leftJoinAndSelect("play_list_song.playlist", "playlist")
        .leftJoinAndSelect("play_list_song.song", "song")
        .leftJoinAndSelect("song.audio", "audio")
        .leftJoinAndSelect("song.album", "album")
        .leftJoinAndSelect("song.image", "image")
        .innerJoinAndSelect("song.artist", "artist")
        .innerJoinAndSelect("artist.user", "user")
        .where("play_list_song.is_active = :isActive", { isActive: true })
        .andWhere("song.is_active = :isActive", { isActive: true })
        .orderBy("play_list_song.id", "ASC")
        .skip(skip)
        .take(limit)
        .select([
          "play_list_song.id",
          "play_list_song.created_at",
          "playlist.id",
          "playlist.title",
          "song.id",
          "song.title",
          "song.created_at",
          "song.release_date",
          "song.play_count",
          "audio.audio_file_path",
          "album.id",
          "album.title",
          "image.id",
          "image.image_path",
          "artist.id",
          "user.id",
          "user.first_name",
          "user.last_name",
          "user.username"
        ]);

      const [playListSongs, total] = await queryBuilder.getManyAndCount();

      // Transform data
      const simplifiedData = playListSongs.map(item => ({
        play_list_id: item.playlist.id,
        playlist_title: item.playlist.title,
        song_id: item.song.id,
        created_at: item.createdAt,
        release_date: item.song.release_date,
        title: item.song.title,
        audio_path: item.song.audio?.audio_file_path || null,
        image_path: item.song.image?.image_path || null,
        artist_id: item.song.artist.id,
        album_title: item.song.album?.title || null,
        artist_first_name: item.song.artist.user?.first_name || null,
        artist_last_name: item.song.artist.user?.last_name || null,
        user_id: item.song.artist.user?.id || null,
        username: item.song.artist.user.username,
        play_count: item.song.play_count,
      }));

      return res.status(200).json({
        status: "success",
        limit: limit,
        skip: skip,
        page: page,
        total: total,
        totalPages: Math.ceil(total / limit),
        data: simplifiedData
      });

    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message
      });
    }
  }
);

// add music in playlist
/**
 * @swagger
 * /v1/user/play_list/{playlist_id}/add_song/:
 *   post:
 *     summary: اضافه کردن آهنگ به پلی‌لیست
 *     description: |
 *       این endpoint برای اضافه کردن یک آهنگ به پلی‌لیست کاربر جاری استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد و کاربر فقط می‌تواند به پلی‌لیست‌های خودش آهنگ اضافه کند.
 *     tags:
 *       - Playlists
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlist_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه پلی‌لیست
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - song_id
 *             properties:
 *               song_id:
 *                 type: integer
 *                 description: شناسه آهنگ برای اضافه کردن به پلی‌لیست
 *                 example: 123
 *     responses:
 *       201:
 *         description: آهنگ با موفقیت به پلی‌لیست اضافه شد
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
 *                   example: "Song added to playlist successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     playlist_id:
 *                       type: integer
 *                       example: 1
 *                     song_id:
 *                       type: integer
 *                       example: 123
 *                     position:
 *                       type: integer
 *                       example: 5
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
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
 *                   example: "Invalid input data"
 *       403:
 *         description: دسترسی غیرمجاز - کاربر مالک پلی‌لیست نیست
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
 *                   example: "You don't have permission to add songs to this playlist"
 *       404:
 *         description: پلی‌لیست یا آهنگ یافت نشد
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
 *                   example: "Playlist or song not found"
 *       409:
 *         description: آهنگ قبلاً در پلی‌لیست وجود دارد
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
 *                   example: "Song already exists in this playlist"
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
playListRouter.post(
  "/:playlist_id/add_song/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const playlistId = Number(req.params.playlist_id);
      const userId = (req as any).user.user_id;
      const { song_id } = req.body;

      // check playlist_id
      if (isNaN(playlistId) || playlistId <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid playlist ID",
        });
      }

      //check song_id
      if (!song_id || isNaN(Number(song_id)) || Number(song_id) <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid song ID",
        });
      }

      const songId = Number(song_id);

      // check playlist
      const playlistRepository = AppDataSource.getRepository(Playlist);
      const playlist = await playlistRepository.findOne({
        where: {
          id: playlistId,
          is_active: true,
          user: { id: userId },
        },
        select: ["id"],
      });

      if (!playlist) {
        return res.status(404).json({
          status: false,
          message: "Playlist not found or you don't have access",
        });
      }

      // check music
      const currentDate = new Date();
      const songRepository = AppDataSource.getRepository(Song);
      const song = await songRepository.createQueryBuilder("song")
      .where("song.id = :songId", {songId: songId})
      .andWhere("song.release_date <= :currentDate", {currentDate: currentDate})
      .andWhere("song.is_active = :isActive", {isActive: true})
      .select([
        "song.id"
      ])
      .getOne();
      // const song = await songRepository.findOne({
      //   where: {
      //     id: songId,
      //     is_active: true,
      //     release_date: 
      //   },
      //   select: {
      //     id: true
      //   },
      // });

      if (!song) {
        return res.status(404).json({
          status: false,
          message: "Song not found"
        });
      }

      // check song dose exist same playlist
      const playlistSongRepository = AppDataSource.getRepository(PlaylistSong);
      const existingSong = await playlistSongRepository.findOne({
        where: {
          playlist: { id: playlistId },
          song: { id: songId },
          is_active: true,
        },
        select: ["id"],
      });

      if (existingSong) {
        return res.status(409).json({
          status: false,
          message: "Song already exists in this playlist",
        });
      }

      // create data
      const playlistSong = new PlaylistSong();
      playlistSong.playlist = playlist;
      playlistSong.song = song;
      // playlistSong.position = finalPosition;
      playlistSong.is_active = true;

      await playlistSongRepository.save(playlistSong);

      return res.status(201).json({
        status: "success",
        message: "Song added to playlist successfully",
        data: {
          id: playlistSong.id,
          playlist_id: playlistId,
          song_id: songId,
        },
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

// remove music in play_list
/**
 * @swagger
 * /v1/user/play_list/{playlist_id}/remove_song/:
 *   delete:
 *     summary: حذف آهنگ از پلی‌لیست (غیرفعال کردن)
 *     description: |
 *       این endpoint برای حذف منطقی یک آهنگ از پلی‌لیست با تنظیم is_active=false استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد و کاربر فقط می‌تواند از پلی‌لیست‌های خودش آهنگ حذف کند.
 *     tags:
 *       - Playlists
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlist_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه پلی‌لیست
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - song_id
 *             properties:
 *               song_id:
 *                 type: integer
 *                 description: شناسه آهنگ برای حذف از پلی‌لیست
 *                 example: 123
 *     responses:
 *       200:
 *         description: آهنگ با موفقیت از پلی‌لیست حذف شد
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
 *                   example: "Song removed from playlist successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     playlist_id:
 *                       type: integer
 *                       example: 1
 *                     song_id:
 *                       type: integer
 *                       example: 123
 *                     is_active:
 *                       type: boolean
 *                       example: false
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
 *                   example: "Invalid input data"
 *       403:
 *         description: دسترسی غیرمجاز
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
 *                   example: "You don't have permission to remove songs from this playlist"
 *       404:
 *         description: پلی‌لیست یا آهنگ یافت نشد
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
 *                   example: "Playlist or song not found in playlist"
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
playListRouter.delete(
  "/:playlist_id/remove_song/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const playlistId = Number(req.params.playlist_id);
      const userId = (req as any).user.user_id;
      const { song_id } = req.body;

      // check playlist_id
      if (isNaN(playlistId) || playlistId <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid playlist ID",
        });
      }

      // check song_id
      if (!song_id || isNaN(Number(song_id)) || Number(song_id) <= 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid song ID",
        });
      }

      const songId = Number(song_id);

      // find PlaylistSong
      const playlistSongRepository = AppDataSource.getRepository(PlaylistSong);
      const playlistSong = await playlistSongRepository.findOne({
        where: {
          playlist: {
            id: playlistId,
            user: { id: userId },
            is_active: true,
          },
          song: {
            id: songId,
            is_active: true,
          },
          is_active: true,
        },
        relations: ["playlist"],
      });

      if (!playlistSong) {
        return res.status(404).json({
          status: false,
          message: "Playlist or song not found in playlist",
        });
      }

      // delete
      playlistSong.is_active = false;
      await playlistSongRepository.save(playlistSong);

      return res.status(200).json({
        status: "success",
        message: "Song removed from playlist successfully",
        data: {
          id: playlistSong.id,
          playlist_id: playlistId,
          song_id: songId,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);
