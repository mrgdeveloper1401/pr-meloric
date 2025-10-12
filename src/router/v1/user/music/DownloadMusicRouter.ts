import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { DownloadMusics } from "../../../../entity/Donwloads";

export const downloadRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DownloadItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: شناسه رکورد دانلود
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ ایجاد رکورد دانلود
 *           example: "2024-01-15T10:30:00.000Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ به‌روزرسانی رکورد دانلود
 *           example: "2024-01-16T14:20:00.000Z"
 *         music_id:
 *           type: integer
 *           description: شناسه موزیک
 *           example: 123
 *         music_title:
 *           type: string
 *           description: عنوان موزیک
 *           example: "Disafine"
 *         audio:
 *           type: string
 *           description: آدرس فایل صوتی
 *           example: "https://storage.com/uploads/audio/song.mp3"
 *         music_cover_image:
 *           type: string
 *           nullable: true
 *           description: آدرس تصویر کاور موزیک
 *           example: "https://storage.com/uploads/images/cover.jpg"
 *         artist_first_name:
 *           type: string
 *           nullable: true
 *           description: نام هنرمند
 *           example: "ماهیر"
 *         artist_last_name:
 *           type: string
 *           nullable: true
 *           description: نام خانوادگی هنرمند
 *           example: "محمدی"
 *         play_count:
 *           type: integer
 *           description: تعداد پخش موزیک
 *           example: 1500
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: تعداد کل آیتم‌ها
 *           example: 45
 *         page:
 *           type: integer
 *           description: شماره صفحه فعلی
 *           example: 1
 *         limit:
 *           type: integer
 *           description: تعداد آیتم‌ها در هر صفحه
 *           example: 20
 *         totalPages:
 *           type: integer
 *           description: تعداد کل صفحات
 *           example: 3
 *     DownloadsListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: وضعیت درخواست
 *           example: "success"
 *         pagination:
 *           $ref: '#/components/schemas/PaginationInfo'
 *         data:
 *           type: array
 *           description: لیست موزیک‌های دانلود شده
 *           items:
 *             $ref: '#/components/schemas/DownloadItem'
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
 *     PageQueryParam:
 *       name: page
 *       in: query
 *       required: false
 *       description: شماره صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *         example: 1
 *     LimitQueryParam:
 *       name: limit
 *       in: query
 *       required: false
 *       description: تعداد آیتم‌ها در هر صفحه
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 50
 *         default: 20
 *         example: 20
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /v1/user/downloads/list:
 *   get:
 *     tags:
 *       - Downloads
 *     summary: دریافت لیست موزیک‌های دانلود شده
 *     description: |
 *       دریافت لیست تمام موزیک‌هایی که کاربر دانلود کرده است
 *       
 *       **نکات مهم:**
 *       - نیاز به احراز هویت با JWT دارد
 *       - فقط موزیک‌های فعال نمایش داده می‌شوند
 *       - اطلاعات کامل موزیک، هنرمند و فایل صوتی برگردانده می‌شود
 *       - قابلیت صفحه‌بندی دارد (حداکثر 50 آیتم در هر صفحه)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageQueryParam'
 *       - $ref: '#/components/parameters/LimitQueryParam'
 *     responses:
 *       '200':
 *         description: موفقیت‌آمیز - لیست موزیک‌های دانلود شده بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DownloadsListResponse'
 *             examples:
 *               success:
 *                 summary: نمونه پاسخ موفق
 *                 value:
 *                   status: "success"
 *                   pagination:
 *                     total: 45
 *                     page: 1
 *                     limit: 20
 *                     totalPages: 3
 *                   data:
 *                     - id: 1
 *                       created_at: "2024-01-15T10:30:00.000Z"
 *                       updated_at: "2024-01-16T14:20:00.000Z"
 *                       music_id: 123
 *                       music_title: "Disafine"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song1.mp3"
 *                       music_cover_image: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/images/cover1.jpg"
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 1500
 *                     - id: 2
 *                       created_at: "2024-01-14T15:45:00.000Z"
 *                       updated_at: "2024-01-14T15:45:00.000Z"
 *                       music_id: 124
 *                       music_title: "Navar Maghz"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song2.mp3"
 *                       music_cover_image: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/images/cover2.jpg"
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 890
 *                     - id: 3
 *                       created_at: "2024-01-13T09:20:00.000Z"
 *                       updated_at: "2024-01-13T09:20:00.000Z"
 *                       music_id: 125
 *                       music_title: "Bishaw Az Hamizhe"
 *                       audio: "https://meloric.s3.ir-thr-at1.arvanstorage.ir/uploads/audio/song3.mp3"
 *                       music_cover_image: null
 *                       artist_first_name: "ماهیر"
 *                       artist_last_name: "محمدی"
 *                       play_count: 1200
 *       '400':
 *         description: پارامترهای ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_parameters:
 *                 summary: پارامترهای صفحه‌بندی نامعتبر
 *                 value:
 *                   status: false
 *                   message: "Invalid pagination parameters"
 *       '401':
 *         description: عدم دسترسی - توکن JWT معتبر ارائه نشده
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: کاربر لاگین نکرده است
 *                 value:
 *                   status: false
 *                   message: "Authentication required"
 *       '500':
 *         description: خطای داخلی سرور
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: خطای سرور
 *                 value:
 *                   status: false
 *                   message: "Internal server error"
 */
downloadRouter.get(
  "/list",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      const skip = (page - 1) * limit;

      const downloadRepository = AppDataSource.getRepository(DownloadMusics);
      const [downloads, total] = await downloadRepository.findAndCount({
        where: {
          user: { id: userId },
          is_active: true
        },
        relations: {
            song: {
                audio: true,
                image: true,
                album: {
                    user: {
                        profile: true
                    }
                }
            },
        },
        select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            song: {
                id: true,
                title: true,
                play_count: true,
                audio: {
                    audio_file_path: true
                },
                image: {
                    image_path: true
                },
                album: {
                    id: true,
                    // title: true,
                    user: {
                        id: true,
                        profile: {
                            id: true,
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            
        },
        order: { createdAt: "DESC" },
        skip,
        take: limit
      });

      const simpleData = downloads.map(
        item => (
            {
                id: item.id,
                created_at: item.createdAt,
                updated_at: item.updatedAt,
                music_id: item.song.id,
                music_title: item.song.title,
                audio: item.song.audio.audio_file_path,
                music_cover_image: item.song.image?.image_path || null,
                artist_first_name: item.song.album.user.profile?.first_name || null,
                artist_last_name: item.song.album.user.profile?.last_name || null,
                play_count: item.song.play_count

            }
        )
      )
      return res.status(200).json({
        status: "success",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
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

/**
 * @swagger
 * /v1/user/downloads/song/{songId}:
 *   post:
 *     summary: افزودن موزیک به دانلود شده‌ها
 *     description: ثبت دانلود یک موزیک توسط کاربر
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: songId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: موزیک به دانلود شده‌ها اضافه شد
 */
// downloadRouter.post(
//   "/song/:songId",
//   authenticateJWT,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = (req as any).user.user_id;
//       const songId = Number(req.params.songId);

//       // بررسی وجود موزیک
//       const songRepository = AppDataSource.getRepository(Song);
//       const song = await songRepository.findOne({
//         where: { id: songId, is_active: true }
//       });

//       if (!song) {
//         return res.status(404).json({
//           status: false,
//           message: "Song not found"
//         });
//       }

//       const downloadRepository = AppDataSource.getRepository(DownloadMusics);

//       // بررسی آیا قبلاً دانلود شده
//       let download = await downloadRepository.findOne({
//         where: {
//           user: { id: userId },
//           song: { id: songId },
//           is_active: true
//         }
//       });

//       if (download) {
//         // افزایش تعداد دانلود
//         download.download_count += 1;
//         await downloadRepository.save(download);
//       } else {
//         // ایجاد رکورد جدید
//         download = downloadRepository.create({
//           user: { id: userId },
//           song: { id: songId },
//           download_type: "song",
//           download_count: 1
//         });
//         await downloadRepository.save(download);
//       }

//       return res.status(200).json({
//         status: "success",
//         message: "Song added to downloads",
//         data: {
//           id: download.id,
//           download_count: download.download_count
//         }
//       });

//     } catch (error) {
//       return res.status(500).json({
//         status: false,
//         message: "Server error"
//       });
//     }
//   }
// );

/**
 * @swagger
 * /v1/user/downloads/album/{albumId}:
 *   post:
 *     summary: افزودن آلبوم به دانلود شده‌ها
 *     description: ثبت دانلود یک آلبوم توسط کاربر
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: albumId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: آلبوم به دانلود شده‌ها اضافه شد
 */
// downloadRouter.post(
//   "/album/:albumId",
//   authenticateJWT,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = (req as any).user.user_id;
//       const albumId = Number(req.params.albumId);

//       // بررسی وجود آلبوم
//       const albumRepository = AppDataSource.getRepository(Album);
//       const album = await albumRepository.findOne({
//         where: { id: albumId, is_active: true }
//       });

//       if (!album) {
//         return res.status(404).json({
//           status: false,
//           message: "Album not found"
//         });
//       }

//       const downloadRepository = AppDataSource.getRepository(DownloadMusics);

//       // بررسی آیا قبلاً دانلود شده
//       let download = await downloadRepository.findOne({
//         where: {
//           user: { id: userId },
//           is_active: true
//         }
//       });

//       if (download) {
//         // افزایش تعداد دانلود
//         download.download_count += 1;
//         await downloadRepository.save(download);
//       } else {
//         // ایجاد رکورد جدید
//         download = downloadRepository.create({
//           user: { id: userId },
//           album: { id: albumId },
//           download_type: "album",
//           download_count: 1
//         });
//         await downloadRepository.save(download);
//       }

//       return res.status(200).json({
//         status: "success",
//         message: "Album added to downloads",
//         data: {
//           id: download.id,
//           download_count: download.download_count
//         }
//       });

//     } catch (error) {
//       return res.status(500).json({
//         status: false,
//         message: "Server error"
//       });
//     }
//   }
// );