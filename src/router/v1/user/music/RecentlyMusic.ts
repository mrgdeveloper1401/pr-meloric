import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Song } from "../../../../entity/Song";
import { plainToClass } from "class-transformer";
import { RecentMusicDto } from "../../../../dtos/music/RecentMusicDtos";
import { validate } from "class-validator";
import { RecentMusic } from "../../../../entity/RecentMusic";
import { LessThan } from "typeorm";

export const recentMusicRouter = Router();

/**
 * @swagger
 * /v1/music/recent/recent_music/:
 *   get:
 *     summary: Get user's recent listening history
 *     description: |
 *       Retrieve user's recently listened songs with complete details.
 *       You can filter by hours (e.g., 72 for last 3 days).
 *       Songs are ordered by most recent first (updated_at descending).
 *       User must be authenticated.
 *     tags:
 *       - Recent Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of recent songs to retrieve
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of songs to skip (for pagination)
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 720
 *           default: 72
 *         description: Filter songs from last N hours (default 72 hours = 3 days)
 *     responses:
 *       200:
 *         description: Successfully retrieved recent songs
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 456
 *                       added_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T12:00:00.000Z"
 *                       song:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           title:
 *                             type: string
 *                             example: "Bohemian Rhapsody"
 *                           release_date:
 *                             type: string
 *                             format: date-time
 *                             example: "1975-10-31T00:00:00.000Z"
 *                           play_count:
 *                             type: integer
 *                             example: 1500
 *                           image:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               image_path:
 *                                 type: string
 *                                 example: "/images/songs/bohemian.jpg"
 *                           album:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               title:
 *                                 type: string
 *                                 example: "A Night at the Opera"
 *                           artist:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               nick_name:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "Queen"
 *                               username:
 *                                 type: string
 *                                 example: "queen_official"
 *                           audio:
 *                             type: object
 *                             properties:
 *                               audio_file_path:
 *                                 type: string
 *                                 example: "/audio/bohemian_rhapsody.mp3"
 *                               audio_format:
 *                                 type: string
 *                                 example: "mp3"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     offset:
 *                       type: integer
 *                       example: 0
 *                     has_more:
 *                       type: boolean
 *                       example: true
 *                     hours:
 *                       type: integer
 *                       example: 72
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       500:
 *         description: Internal server error
 */
recentMusicRouter.get(
  "/recent_music/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const recentMusicRepository = AppDataSource.getRepository(RecentMusic);

      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const hours = parseInt(req.query.hours as string) || 72; // Default 72 hours

      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - hours);

      const queryBuilder = recentMusicRepository
        .createQueryBuilder("recent")
        .select(["recent.id", "recent.createdAt", "recent.updatedAt"])
        .leftJoinAndSelect("recent.song", "song")
        .leftJoinAndSelect("song.artist", "artist")
        .leftJoin("artist.user", "user")
        .addSelect(["artist.id", "artist.nick_name", "user.username"])
        .leftJoinAndSelect("song.album", "album")
        .addSelect(["album.id", "album.title"])
        .leftJoinAndSelect("song.audio", "audio")
        .addSelect(["audio.audio_file_path", "audio.audio_format"])
        .leftJoinAndSelect("song.image", "song_image")
        .addSelect("song_image.image_path")
        .where("recent.user.id = :userId", { userId })
        .andWhere("recent.is_active = :isActive", { isActive: true })
        .andWhere("song.is_active = :songIsActive", { songIsActive: true })
        .andWhere("audio.is_active = :audioIsActive", { audioIsActive: true })
        .andWhere("recent.updatedAt >= :hoursAgo", { hoursAgo })
        .orderBy("recent.updatedAt", "DESC");

      // گرفتن داده‌ها با pagination
      const recentMusics = await queryBuilder
        .skip(offset)
        .take(limit)
        .getMany();

      // گرفتن تعداد کل برای pagination (با فیلتر hours)
      const totalQuery = recentMusicRepository
        .createQueryBuilder("recent")
        .where("recent.user.id = :userId", { userId })
        .andWhere("recent.is_active = :isActive", { isActive: true })
        .andWhere("recent.updatedAt >= :hoursAgo", { hoursAgo })
        .innerJoin("recent.song", "song")
        .andWhere("song.is_active = :songIsActive", { songIsActive: true });

      const total = await totalQuery.getCount();

      const response = recentMusics.map((recent) => ({
        id: recent.id,
        added_at: recent.updatedAt,
        song: {
          id: recent.song.id,
          title: recent.song.title,
          release_date: recent.song.release_date,
          play_count: recent.song.play_count,
          image: recent.song.image
            ? {
                image_path: recent.song.image.image_path,
              }
            : null,
          album: recent.song.album
            ? {
                id: recent.song.album.id,
                title: recent.song.album.title,
              }
            : null,
          artist: recent.song.artist
            ? {
                id: recent.song.artist.id,
                nick_name: recent.song.artist.nick_name,
                username: recent.song.artist.user?.username || null,
              }
            : null,
          audio: recent.song.audio
            ? {
                audio_file_path: recent.song.audio.audio_file_path,
                audio_format: recent.song.audio.audio_format,
              }
            : null,
        },
      }));

      return res.json({
        status: "success",
        data: response,
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
          hours, // اضافه کردن hours به پاسخ
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// add_recent_music method post
/**
 * @swagger
 * /v1/music/recent/add_recent_music:
 *   post:
 *     summary: Add song to recent listening history
 *     description: |
 *       Add a song to user's recent listening history.
 *       If the song already exists in recent list, its timestamp will be updated.
 *       User must be authenticated.
 *     tags:
 *       - Recent Music
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
 *             properties:
 *               song_id:
 *                 type: integer
 *                 description: ID of the song to add to recent list
 *                 example: 123
 *     responses:
 *       201:
 *         description: Song successfully added to recent list
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
 *                   example: "Song added to recent list"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 456
 *                     song_id:
 *                       type: integer
 *                       example: 123
 *                     user_id:
 *                       type: integer
 *                       example: 789
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T12:00:00.000Z"
 *       400:
 *         description: Bad request - missing or invalid song_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Song ID is required"
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: Song not found or not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Song not found"
 *       500:
 *         description: Internal server error
 */
recentMusicRouter.post(
  "/add_recent_music/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      // get user id by request
      const userId = (req as any).user.user_id;

      const recentMusicDto = plainToClass(RecentMusicDto, req.body);
      const errors = await validate(recentMusicDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid data",
          error: errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          })),
        });
      }

      const date = new Date();
      const musicRepository = AppDataSource.getRepository(Song);
      const findMusic = await musicRepository.findOne({
        where: {
          id: recentMusicDto.song_id,
          is_active: true,
          release_date: LessThan(date),
        },
        select: {id: true}
      });
      if (!findMusic) {
        return res.status(404).json({
          status: false,
          message: "music not found",
        });
      }

    //   check duplicate
    const recentMusicRepository = AppDataSource.getRepository(RecentMusic);
    const checkDuplicate = await recentMusicRepository.findOne(
        {
            where: {
                is_active: true,
                song: {id: recentMusicDto.song_id}
            },
            select: {id: true}
        }
    );
    if (checkDuplicate) {
        return res.status(400).json(
            {
                status: false,
                message: "music already exists in recent music"
            }
        )
    }
      //   create recent music
      const createRecentMusic = new RecentMusic();
      createRecentMusic.song = findMusic;
      createRecentMusic.user = userId;
      await createRecentMusic.save();

      return res.status(201).json({
        status: false,
        message: "success add recent music",
        id: createRecentMusic.id,
        song_id: createRecentMusic.song.id,
        user_id: createRecentMusic.user.id,
        created_at: createRecentMusic.createdAt,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
      });
    }
  }
);
