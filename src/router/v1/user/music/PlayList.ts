import { Router, Request, Response } from "express";
import {
  authenticateJWT,
  checkUserAuthenticateJwt,
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

      const playListSongRepository = AppDataSource.getRepository(PlaylistSong);

      // First, check if playlist exists and user has access (simple query)
      const playlistAccess = await playListSongRepository
        .createQueryBuilder("ps")
        .innerJoin("ps.playlist", "p")
        .where("p.id = :playlistId", { playlistId })
        .andWhere("p.is_active = :isActive", { isActive: true })
        .andWhere("p.user_id = :userId", { userId })
        .andWhere("ps.is_active = :isActive", { isActive: true })
        .select("ps.id")
        .limit(1)
        .getOne();

      if (!playlistAccess) {
        return res.status(404).json({
          status: false,
          message: "Playlist not found or you don't have access"
        });
      }

      // Main query with optimized joins and selected fields only
      const queryBuilder = playListSongRepository
        .createQueryBuilder("ps")
        .innerJoinAndSelect("ps.playlist", "p")
        .innerJoinAndSelect("ps.song", "s")
        .innerJoinAndSelect("s.audio", "audio")
        .innerJoinAndSelect("s.album", "album")
        .leftJoinAndSelect("s.image", "image")
        .innerJoinAndSelect("s.artist", "artist")
        .innerJoinAndSelect("artist.user", "user")
        .where("ps.is_active = :isActive", { isActive: true })
        .andWhere("p.id = :playlistId", { playlistId })
        .andWhere("p.is_active = :isActive", { isActive: true })
        .andWhere("p.user_id = :userId", { userId })
        .orderBy("ps.id", "ASC")
        .skip(skip)
        .take(limit);

      // Select only needed fields to reduce data transfer
      queryBuilder.select([
        "ps.id",
        "p.id",
        "s.id",
        "s.title",
        "s.createdAt",
        "s.release_date",
        "s.play_count",
        "audio.audio_file_path",
        "album.title",
        "image.image_path",
        "artist.id",
        "artist.first_name",
        "artist.last_name",
        "user.username"
      ]);

      const [playListSongs, total] = await queryBuilder.getManyAndCount();

      // Transform data
      const simplifiedData = playListSongs.map(item => ({
        play_list_id: item.playlist.id,
        song_id: item.song.id,
        created_at: item.song.createdAt,
        release_data: item.song.release_date,
        title: item.song.title,
        audio_path: item.song.audio.audio_file_path,
        image_path: item.song.image?.image_path || null,
        artist_id: item.song.artist.id,
        album_title: item.song.album?.title || null,
        artist_first_name: item.song.artist.first_name,
        artist_last_name: item.song.artist.last_name,
        username: item.song.artist.user.username,
        release_date: item.song.release_date,
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
      console.error("Error fetching playlist songs:", error);
      return res.status(500).json({
        status: false,
        message: "Internal server error"
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
      const { song_id, position = 0 } = req.body;

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
      const songRepository = AppDataSource.getRepository(Song);
      const song = await songRepository.findOne({
        where: {
          id: songId,
          is_active: true,
          album: {
            is_active: true,
          },
        },
        select: ["id"],
      });

      if (!song) {
        return res.status(404).json({
          status: false,
          message: "Song not found",
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

      // calc position
      // let finalPosition = position;
      // if (!position || position < 0) {
      //     const lastPosition = await playlistSongRepository
      //         .createQueryBuilder("playlistSong")
      //         .select("MAX(playlistSong.position)", "maxPosition")
      //         .where("playlistSong.playlist_id = :playlistId", { playlistId })
      //         .andWhere("playlistSong.is_active = :isActive", { isActive: true })
      //         .getRawOne();

      //     finalPosition = (lastPosition.maxPosition || 0) + 1;
      // }

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
          // position: finalPosition,
          // created_at: playlistSong.created_at
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

// −−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−−
// add music into one playList
// /**
//  * @swagger
//  * /v1/user/play_list/add_music_one_play_list/add_music/{musicId}:
//  *   post:
//  *     summary: افزودن آهنگ به پلی‌لیست
//  *     description: |
//  *       این endpoint برای افزودن آهنگ به پلی‌لیست کاربر استفاده می‌شود.
//  *       اگر کاربر پلی‌لیست فعال نداشته باشد، یک پلی‌لیست جدید ایجاد شده و آهنگ به آن اضافه می‌شود.
//  *       نیاز به احراز هویت JWT دارد.
//  *     tags:
//  *       - Playlists
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: musicId
//  *         required: true
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *         description: شناسه آهنگ برای افزودن به پلی‌لیست
//  *         example: 123
//  *     responses:
//  *       201:
//  *         description: آهنگ با موفقیت به پلی‌لیست اضافه شد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: string
//  *                   example: "success"
//  *                 message:
//  *                   type: string
//  *                   example: "successfly add music"
//  *       400:
//  *         description: داده‌های ورودی نامعتبر
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   oneOf:
//  *                     - type: string
//  *                       example: "music id is required"
//  *                     - type: string
//  *                       example: "request body is required"
//  *       401:
//  *         description: عدم احراز هویت یا توکن نامعتبر
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Invalid or expired token"
//  *       404:
//  *         description: آهنگ یا کاربر یافت نشد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   oneOf:
//  *                     - type: string
//  *                       example: "music not found"
//  *                     - type: string
//  *                       example: "user not found"
//  *       500:
//  *         description: خطای سرور داخلی
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "server error"
//  *                 error:
//  *                   type: string
//  *                   example: "Error message details"
//  */
// playListRouter.post(
//     "/add_music_one_play_list/add_music/:musicId",
//     authenticateJWT,
//     checkUserAuthenticateJwt,
//     async (req: Request, res: Response) => {
//         try {
//         const userId = (req as any).user.user_id;
//         const musicId = Number(req.params.musicId);

//         if (isNaN(musicId)) {
//             return res.status(400).json(
//                 {
//                     status: false,
//                     message: "music id is required"
//                 }
//             )
//         }

//         // check music
//         const musicRepository = AppDataSource.getRepository(Song);
//         const checkMusic = await musicRepository.findOne(
//             {
//                 where: {
//                     id: musicId,
//                     is_active: true
//                 },
//                 select: {id: true}
//             }
//         )
//         if (!checkMusic) {
//             return res.status(404).json(
//                 {
//                     status: false,
//                     message: "music not found"
//                 }
//             )
//         }
//         const playListRepository = AppDataSource.getRepository(Playlist);
//         const checkPlayList = await playListRepository.findOne(
//             {
//                 where: {
//                     user: {id: userId},
//                     is_active: true
//                 },
//                 select: {id: true}
//             }
//         );
//         if (!checkPlayList) {
//             // create play list
//             const newPlayList = new Playlist();
//             newPlayList.user = userId
//             newPlayList.title = `play list one user ${userId}`
//             newPlayList.description = `description play list user ${userId}`
//             await newPlayList.save()

//             // add music into playlist
//             const addMusicNewPlaylist = new PlaylistSong;
//             addMusicNewPlaylist.playlist = newPlayList;
//             addMusicNewPlaylist.song = checkMusic;
//             await addMusicNewPlaylist.save();

//             return res.status(201).json(
//                 {
//                     status: "success",
//                     message: "successfly create playList and add music"
//                 }
//             );
//         }

//         const addMusic = new PlaylistSong;
//         addMusic.playlist = checkPlayList;
//         addMusic.song = checkMusic;
//         await addMusic.save()

//         return res.status(201).json(
//             {
//                 status: "success",
//                 message: "successfly add music"
//             }
//         )
//         } catch (error) {
//             return res.status(500).json(
//                 {
//                     status: false,
//                     message: "server error",
//                     error: error.message
//                 }
//             )
//         }
//     }
// );

// // get all music by playlist with pagination
// /**
//  * @swagger
//  * /v1/user/play_list/get_my_playlist_songs:
//  *   get:
//  *     summary: دریافت آهنگ‌های آخرین پلی‌لیست کاربر با صفحه‌بندی
//  *     description: |
//  *       این endpoint آخرین پلی‌لیست فعال کاربر و آهنگ‌های موجود در آن را با قابلیت صفحه‌بندی برمی‌گرداند.
//  *       نیاز به احراز هویت JWT دارد.
//  *     tags:
//  *       - Playlists
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           default: 1
//  *         description: شماره صفحه
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           maximum: 100
//  *           default: 10
//  *         description: تعداد آیتم‌ها در هر صفحه
//  *     responses:
//  *       200:
//  *         description: اطلاعات پلی‌لیست و آهنگ‌های آن با موفقیت برگردانده شد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: string
//  *                   example: "success"
//  *                 total:
//  *                   type: integer
//  *                   example: 50
//  *                 page:
//  *                   type: integer
//  *                   example: 1
//  *                 limit:
//  *                   type: integer
//  *                   example: 10
//  *                 totalPages:
//  *                   type: integer
//  *                   example: 5
//  *                 hasNext:
//  *                   type: boolean
//  *                   example: true
//  *                 hasPrev:
//  *                   type: boolean
//  *                   example: false
//  *                 playlist:
//  *                   type: object
//  *                   properties:
//  *                     id:
//  *                       type: integer
//  *                       example: 1
//  *                     title:
//  *                       type: string
//  *                       example: "My Playlist"
//  *                     description:
//  *                       type: string
//  *                       example: "My favorite songs"
//  *                 data:
//  *                   type: array
//  *                   items:
//  *                     type: object
//  *                     properties:
//  *                       id:
//  *                         type: integer
//  *                         example: 1
//  *                       play_list_id:
//  *                         type: integer
//  *                         example: 1
//  *                       song_id:
//  *                         type: integer
//  *                         example: 123
//  *                       title:
//  *                         type: string
//  *                         example: "Song Title"
//  *                       audio_path:
//  *                         type: string
//  *                         example: "https://example.com/audio.mp3"
//  *                       image_path:
//  *                         type: string
//  *                         nullable: true
//  *                         example: "https://example.com/image.jpg"
//  *                       artist_id:
//  *                         type: integer
//  *                         example: 456
//  *                       artist_first_name:
//  *                         type: string
//  *                         nullable: true
//  *                         example: "John"
//  *                       artist_last_name:
//  *                         type: string
//  *                         nullable: true
//  *                         example: "Doe"
//  *                       artist_nick_name:
//  *                         type: string
//  *                         nullable: true
//  *                         example: "JD"
//  *                       username:
//  *                         type: string
//  *                         example: "johndoe"
//  *                       created_at:
//  *                         type: string
//  *                         format: date-time
//  *                         example: "2023-01-01T00:00:00.000Z"
//  *                       release_date:
//  *                         type: string
//  *                         format: date-time
//  *                         example: "2023-01-01T00:00:00.000Z"
//  *                       play_count:
//  *                         type: integer
//  *                         example: 150
//  *       400:
//  *         description: پارامترهای صفحه‌بندی نامعتبر
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Invalid pagination parameters"
//  *       404:
//  *         description: پلی‌لیستی برای کاربر یافت نشد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "No playlist found for user"
//  *       500:
//  *         description: خطای سرور داخلی
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "server error"
//  */
// playListRouter.get(
//     "/get_my_playlist_songs",
//     authenticateJWT,
//     checkUserAuthenticateJwt,
//     async (req: Request, res: Response) => {
//         try {
//             const userId = (req as any).user.user_id;

//             // pagination
//             let page = parseInt(req.query.page as string) || 1;
//             let limit = parseInt(req.query.limit as string) || 10;

//             // validate
//             if (page < 1) page = 1;
//             if (limit < 1) limit = 1;
//             if (limit > 100) limit = 100;

//             const skip = (page - 1) * limit;

//             // Find user's latest active playlist using Query Builder
//             const playListRepository = AppDataSource.getRepository(Playlist);
//             const userPlaylist = await playListRepository
//                 .createQueryBuilder("playlist")
//                 .where("playlist.user_id = :userId", { userId })
//                 .andWhere("playlist.is_active = :isActive", { isActive: true })
//                 .orderBy("playlist.createdAt", "DESC")
//                 .select(["playlist.id", "playlist.title", "playlist.description"])
//                 .getOne();

//             if (!userPlaylist) {
//                 return res.status(404).json({
//                     status: false,
//                     message: "No playlist found for user"
//                 });
//             }

//             const playlistSongRepository = AppDataSource.getRepository(PlaylistSong);

//             // Count total songs using Query Builder
//             const total = await playlistSongRepository
//                 .createQueryBuilder("playlistSong")
//                 .where("playlistSong.playlist_id = :playlistId", { playlistId: userPlaylist.id })
//                 .andWhere("playlistSong.is_active = :isActive", { isActive: true })
//                 .getCount();

//             // Calculate pagination info
//             const totalPages = Math.ceil(total / limit);

//             // Get paginated data using optimized Query Builder with joins
//             const playlistSongs = await playlistSongRepository
//                 .createQueryBuilder("playlistSong")
//                 .innerJoinAndSelect("playlistSong.song", "song")
//                 .innerJoinAndSelect("song.artist", "artist")
//                 .innerJoinAndSelect("artist.user", "user")
//                 .leftJoinAndSelect("song.audio", "audio")
//                 .leftJoinAndSelect("song.image", "image")
//                 .where("playlistSong.playlist_id = :playlistId", { playlistId: userPlaylist.id })
//                 .andWhere("playlistSong.is_active = :isActive", { isActive: true })
//                 .andWhere("song.is_active = :songIsActive", { songIsActive: true })
//                 .select([
//                     "playlistSong.id",
//                     "playlistSong.createdAt",
//                     "playlistSong.updatedAt",
//                     "song.id",
//                     "song.title",
//                     "song.play_count",
//                     "song.release_date",
//                     "audio.audio_file_path",
//                     "image.image_path",
//                     "artist.id",
//                     "artist.first_name",
//                     "artist.last_name",
//                     "artist.nick_name",
//                     "user.username"
//                 ])
//                 .orderBy("playlistSong.createdAt", "DESC")
//                 .skip(skip)
//                 .take(limit)
//                 .getMany();

//             // Transform data to simple format
//             const simpleData = playlistSongs.map(item => ({
//                 id: item.id,
//                 play_list_id: userPlaylist.id,
//                 song_id: item.song?.id,
//                 artist_id: item.song.artist.id,
//                 title: item.song?.title,
//                 audio_path: item.song.audio?.audio_file_path,
//                 image_path: item.song.image?.image_path || null,
//                 artist_first_name: item.song.artist?.first_name || null,
//                 artist_last_name: item.song.artist?.last_name || null,
//                 artist_nick_name: item.song.artist?.nick_name || null,
//                 username: item.song.artist.user.username,
//                 created_at: item.createdAt,
//                 release_date: item.song.release_date,
//                 play_count: item.song.play_count
//             }));

//             return res.status(200).json({
//                 status: "success",
//                 total: total,
//                 page: page,
//                 limit: limit,
//                 totalPages: totalPages,
//                 hasNext: page < totalPages,
//                 hasPrev: page > 1,
//                 playlist: {
//                     id: userPlaylist.id,
//                     title: userPlaylist.title,
//                     description: userPlaylist.description
//                 },
//                 data: simpleData
//             });

//         } catch (error) {
//             return res.status(500).json({
//                 status: false,
//                 message: "server error",
//                 error: error.message
//             });
//         }
//     }
// );

// // delete music in play list
// /**
//  * @swagger
//  * /v1/user/play_list/remove_song_from_playlist:
//  *   delete:
//  *     summary: حذف آهنگ از پلی‌لیست
//  *     description: |
//  *       این endpoint برای حذف منطقی یک آهنگ از پلی‌لیست کاربر با تنظیم is_active=false استفاده می‌شود.
//  *       نیاز به احراز هویت JWT دارد و کاربر فقط می‌تواند از پلی‌لیست‌های خودش آهنگ حذف کند.
//  *     tags:
//  *       - Playlists
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - id
//  *             properties:
//  *               id:
//  *                 type: integer
//  *                 description: شناسه آهنگ درون پلی لیست برای حذف از پلی‌لیست
//  *                 example: 123
//  *     responses:
//  *       200:
//  *         description: آهنگ با موفقیت از پلی‌لیست حذف شد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: string
//  *                   example: "success"
//  *                 message:
//  *                   type: string
//  *                   example: "Song removed from playlist successfully"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     id:
//  *                       type: integer
//  *                       example: 1
//  *       400:
//  *         description: داده‌های ورودی نامعتبر
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Invalid song ID"
//  *       404:
//  *         description: پلی‌لیست یا آهنگ یافت نشد
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "Playlist or song not found in playlist"
//  *       500:
//  *         description: خطای سرور داخلی
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 status:
//  *                   type: boolean
//  *                   example: false
//  *                 message:
//  *                   type: string
//  *                   example: "server error"
//  */
// playListRouter.delete(
//     "/remove_song_from_playlist",
//     authenticateJWT,
//     checkUserAuthenticateJwt,
//     async (req: Request, res: Response) => {
//         try {
//             const userId = (req as any).user.user_id;
//             const { id } = req.body;

//             // check song_id
//             if (!id || isNaN(Number(id)) || Number(id) <= 0) {
//                 return res.status(400).json({
//                     status: false,
//                     message: "Invalid song ID"
//                 });
//             }

//             const iD = Number(id);

//             // find playlist
//             const playListRepository = AppDataSource.getRepository(Playlist);
//             const userPlaylist = await playListRepository.findOne({
//                 where: {
//                     user: { id: userId },
//                     is_active: true
//                 }
//             });

//             if (!userPlaylist) {
//                 return res.status(404).json({
//                     status: false,
//                     message: "No playlist found for user"
//                 });
//             }

//             // find music in playlist
//             const playlistSongRepository = AppDataSource.getRepository(PlaylistSong);
//             const playlistSong = await playlistSongRepository.findOne({
//                 where: {
//                     playlist: { id: userPlaylist.id },
//                     id: iD,
//                     is_active: true
//                 },
//                 select: {
//                     id: true,
//                     playlist: {
//                         id: true
//                     }
//                 },
//                 relations: {playlist: true}
//             });

//             if (!playlistSong) {
//                 return res.status(404).json({
//                     status: false,
//                     message: "Song not found in playlist"
//                 });
//             }

//             // soft delete
//             playlistSong.is_active = false;
//             await playlistSongRepository.save(playlistSong);

//             return res.status(200).json({
//                 status: "success",
//                 message: "Song removed from playlist successfully",
//                 data: {
//                     id: id
//                 }
//             });

//         } catch (error) {
//             return res.status(500).json({
//                 status: false,
//                 message: "server error",
//                 error: error.message
//             });
//         }
//     }
// );
