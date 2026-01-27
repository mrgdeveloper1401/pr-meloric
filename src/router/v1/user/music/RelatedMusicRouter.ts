import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Song } from "../../../../entity/Song";


export const relatedMusicrouter = Router();


// get related music for a song
/**
 * @swagger
 * /v1/related_music/related_music_simple/:
 *   get:
 *     summary: دریافت لیست موزیک‌های مشابه
 *     description: |
 *       این endpoint برای دریافت لیست موزیک‌های مشابه یک ترانه خاص استفاده می‌شود.
 *       موزیک‌ها بر اساس آرتیست مشترک، ژانر مشترک و محبوبیت مرتب می‌شوند.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Related Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: song_id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: شناسه موزیک اصلی که می‌خواهید موزیک‌های مشابه آن را دریافت کنید
 *         example: 123
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: تعداد موزیک‌های مشابه برای بازگشت (حداکثر 50)
 *         example: 10
 *     responses:
 *       200:
 *         description: لیست موزیک‌های مشابه با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: وضعیت درخواست
 *                   example: "success"
 *                 current_song_id:
 *                   type: integer
 *                   description: شناسه موزیک اصلی ارسال شده
 *                   example: 123
 *                 count:
 *                   type: integer
 *                   description: تعداد موزیک‌های مشابه بازگشتی
 *                   example: 8
 *                 data:
 *                   type: array
 *                   description: آرایه‌ای از موزیک‌های مشابه
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه موزیک مشابه
 *                         example: 456
 *                       title:
 *                         type: string
 *                         description: عنوان موزیک
 *                         example: "آهنگ عاشقانه"
 *                       play_count:
 *                         type: integer
 *                         description: تعداد دفعات پخش موزیک
 *                         example: 15000
 *                       release_date:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ انتشار موزیک
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       artist:
 *                         type: object
 *                         description: اطلاعات آرتیست اصلی موزیک
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: شناسه آرتیست
 *                             example: 78
 *                           nick_name:
 *                             type: string
 *                             description: نام مستعار آرتیست
 *                             example: "خواننده محبوب"
 *                           first_name:
 *                             type: string
 *                             description: نام آرتیست
 *                             example: "علی"
 *                           last_name:
 *                             type: string
 *                             description: نام خانوادگی آرتیست
 *                             example: "رضایی"
 *                       featured_artists:
 *                         type: array
 *                         description: لیست هنرمندان مهمان (Featured Artists)
 *                         items:
 *                           type: object
 *                           properties:
 *                             first_name:
 *                               type: string
 *                               description: نام هنرمند مهمان
 *                               example: "سارا"
 *                             last_name:
 *                               type: string
 *                               description: نام خانوادگی هنرمند مهمان
 *                               example: "محمدی"
 *                       image:
 *                         type: object
 *                         description: اطلاعات تصویر کاور موزیک
 *                         properties:
 *                           image_path:
 *                             type: string
 *                             description: آدرس تصویر کاور
 *                             example: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/song_cover.jpg"
 *       400:
 *         description: درخواست نامعتبر - song_id الزامی است
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
 *                   example: "song_id is required"
 *       404:
 *         description: موزیک مورد نظر یافت نشد
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
 *                   example: "Song not found"
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
 *                 error:
 *                   type: string
 *                   description: جزئیات خطا (در محیط توسعه)
 *                   example: "QueryFailedError: syntax error at or near \")\""
 */
relatedMusicrouter.get(
    "/related_music_simple/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const limit = Number(req.query.limit) || 10;
            const songId = Number(req.query.song_id);
            
            if (!songId) {
                return res.status(400).json({
                    status: false,
                    message: "song_id is required"
                });
            }

            const songRepository = AppDataSource.getRepository(Song);
            
            const currentSong = await songRepository.findOne({
                where: { id: songId },
            });

            if (!currentSong) {
                return res.status(404).json({
                    status: false,
                    message: "Song not found"
                });
            }

            const similarSongs = await songRepository
                .createQueryBuilder("song")
                .leftJoinAndSelect("song.artist", "artist")
                .leftJoinAndSelect("artist.user", "user")
                .leftJoinAndSelect("song.album", "album")
                .leftJoinAndSelect("album.genre", "genre")
                .leftJoinAndSelect("song.image", "image")
                .leftJoinAndSelect("song.featured_artists", "featured_artists")
                .leftJoinAndSelect("featured_artists.user", "featured_artists_user")
                .where("song.is_active = true")
                .andWhere("song.id != :songId", { songId })
                .addOrderBy("song.play_count", "DESC")
                .setParameters({
                    songId: songId,
                    artistId: currentSong.artist?.id || 0,
                    genreId: currentSong.album?.genre?.id || 0
                })
                .select([
                    "song.id", 
                    "song.title", 
                    "song.play_count", 
                    "song.release_date",
                    "artist.id", 
                    "artist.nick_name", 
                    "user.first_name", 
                    "user.last_name",
                    "featured_artists_user.first_name", 
                    "featured_artists_user.last_name",
                    "image.image_path"
                ])
                .take(limit)
                .getMany();

            return res.status(200).json({
                status: "success",
                current_song_id: songId,
                count: similarSongs.length,
                data: similarSongs
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