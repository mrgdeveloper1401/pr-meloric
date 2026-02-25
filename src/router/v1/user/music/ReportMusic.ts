// report music

import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { LessThan } from "typeorm";
import { AppDataSource } from "../../../../data-source";
import { SongReportDto } from "../../../../dtos/music/ReportSongDto";
import { Song, SongReport } from "../../../../entity/Song";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { Request, Response, Router } from "express";

export const reportMusic = Router();

/**
 * @swagger
 * /v1/user/report/music/report_music:
 *   post:
 *     summary: گزارش یک آهنگ
 *     description: |
 *       این endpoint برای گزارش یک آهنگ توسط کاربر استفاده می‌شود.
 *       هر کاربر فقط یک بار می‌تواند یک آهنگ خاص را گزارش کند.
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت دارد
 *       - هر کاربر فقط یکبار می‌تواند هر آهنگ را گزارش کند
 *       - بعد از گزارش، آهنگ برای بررسی به ادمین گزارش داده می‌شود
 *     tags: [Music]
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
 *               - is_report
 *             properties:
 *               song_id:
 *                 type: integer
 *                 description: شناسه آهنگ مورد نظر برای گزارش
 *                 example: 42
 *                 minimum: 1
 *               is_report:
 *                 type: integer
 *                 example: true
 *     responses:
 *       201:
 *         description: گزارش با موفقیت ثبت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: you successfully report song 42
 *       400:
 *         description: خطای اعتبارسنجی یا گزارش تکراری
 *         content:
 *           application/json:
 *             oneOf:
 *               - schema:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         description: فیلد دارای خطا
 *                         example: song_id
 *                       value:
 *                         type: object
 *                         description: محدودیت‌های نقض شده
 *                         example:
 *                           isNotEmpty: "song_id should not be empty"
 *                           isInt: "song_id must be an integer number"
 *               - schema:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: you already report this song
 *       401:
 *         description: نیاز به احراز هویت
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
 *                   example: Unauthorized
 *       404:
 *         description: آهنگ پیدا نشد
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
 *                   example: song not found
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
 *                   example: server error
 *                 error:
 *                   type: string
 *                   example: "Cannot read property 'id' of undefined"
 */
reportMusic.post(
  "/report_music/",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      // validate request body
      const reportSongDto = plainToClass(SongReportDto, req.body);
      const errors = await validate(reportSongDto);
      if (errors.length > 0) {
        return res.status(400).json(
          errors.map((i) => ({
            field: i.property,
            value: i.constraints,
          }))
        );
      }

      // check song
      const userId = (req as any).user.user_id;
      const today = new Date();
      const SongRepository = AppDataSource.getRepository(Song);
      const checkSong = await SongRepository.findOne({
        where: {
          id: reportSongDto.song_id,
          is_active: true,
          release_date: LessThan(today),
        },
        select: {
          id: true,
        },
      });
      if (!checkSong) {
        return res.status(404).json({
          status: false,
          message: "song not found",
        });
      }

      // check report song already exists
      const reportSongRepository = AppDataSource.getRepository(SongReport);
      const checkReport = await reportSongRepository.findOne({
        where: {
          song: checkSong,
          user: { id: userId },
          is_active: true,
        },
        select: {
          id: true,
          is_report: true,
        },
      });

      if (!checkReport) {
        // create song report report and check
        await SongReport.insert({
          song: { id: checkSong.id },
          user: { id: userId },
          is_report: true,
        });

        return res.status(201).json({
          status: "success",
          message: `you successfly report song ${checkSong.id}`,
        });
      } else {
        return res.status(400).json({
          status: false,
          message: "you already report this song",
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// get list of song reports
/**
 * @swagger
 * /v1/user/report/music/reports_list:
 *   get:
 *     summary: دریافت لیست گزارش‌های آهنگ
 *     description: |
 *       این endpoint برای دریافت لیست گزارش‌های آهنگ با قابلیت صفحه‌بندی و فیلتر استفاده می‌شود.
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت
 *       - قابلیت فیلتر بر اساس وضعیت گزارش
 *       - مرتب‌سازی بر اساس تاریخ ایجاد (نزولی)
 *     tags: [Music Reports]
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
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست گزارش‌ها با موفقیت دریافت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 total:
 *                   type: integer
 *                   description: تعداد کل گزارش‌ها
 *                   example: 150
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 total_pages:
 *                   type: integer
 *                   description: تعداد کل صفحات
 *                   example: 8
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه گزارش
 *                         example: 5
 *                       is_report:
 *                         type: boolean
 *                         description: وضعیت گزارش
 *                         example: true
 *                       is_active:
 *                         type: boolean
 *                         description: وضعیت فعال بودن گزارش
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ ایجاد گزارش
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 10
 *                           username:
 *                             type: string
 *                             example: "john_doe"
 *                           first_name:
 *                             type: string
 *                             example: "John"
 *                           last_name:
 *                             type: string
 *                             example: "Doe"
 *                       song:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 42
 *                           title:
 *                             type: string
 *                             example: "آهنگ جدید"
 *                           artist:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 3
 *                               nick_name:
 *                                 type: string
 *                                 example: "Artist Name"
 *       401:
 *         description: نیاز به احراز هویت
 *       403:
 *         description: دسترسی غیرمجاز (فقط ادمین)
 *       500:
 *         description: خطای سرور
 */
reportMusic.get(
  "/reports_list",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const reportRepository = AppDataSource.getRepository(SongReport);

      // query builder
      const queryBuilder = reportRepository
        .createQueryBuilder("songReport")
        .leftJoinAndSelect("songReport.user", "user")
        .leftJoinAndSelect("songReport.song", "song")
        .orderBy("songReport.createdAt", "DESC")
        .where("songReport.is_active = :isActive", { isActive: true })
        .skip(skip)
        .take(limit);

      queryBuilder.select([
        "songReport.id",
        "songReport.is_report",
        "songReport.createdAt",
        "user.id",
        "song.id",
      ]);

      const [reports, total] = await queryBuilder.getManyAndCount();
      const simpleData = reports.map((d) => ({
        id: d.id,
        song_id: d.song.id,
        user_id: d.user.id,
        created_at: d.createdAt,
        is_report: d.is_report,
      }));
      return res.status(200).json({
        status: "success",
        total,
        page,
        total_pages: Math.ceil(total / limit),
        limit,
        data: simpleData,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// get song report details
/**
 * @swagger
 * /v1/user/report/music/reports/{id}:
 *   get:
 *     summary: دریافت جزئیات یک گزارش آهنگ
 *     description: |
 *       این endpoint برای دریافت جزئیات کامل یک گزارش خاص استفاده می‌شود.
 *
 *       **نکات مهم:**
 *       - نیاز به احراز هویت دارد
 *       - اطلاعات کامل کاربر گزارش‌دهنده و آهنگ گزارش‌شده را برمی‌گرداند
 *     tags: [ Music Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه گزارش
 *         example: 5
 *     responses:
 *       200:
 *         description: جزئیات گزارش با موفقیت دریافت شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     is_report:
 *                       type: boolean
 *                       example: true
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 10
 *                         username:
 *                           type: string
 *                           example: "john_doe"
 *                         first_name:
 *                           type: string
 *                           example: "John"
 *                         last_name:
 *                           type: string
 *                           example: "Doe"
 *                         email:
 *                           type: string
 *                           example: "john@example.com"
 *                         phone:
 *                           type: string
 *                           example: "09123456789"
 *                     song:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 42
 *                         title:
 *                           type: string
 *                           example: "آهنگ جدید"
 *                         release_date:
 *                           type: string
 *                           format: date
 *                           example: "2024-01-01"
 *                         play_count:
 *                           type: integer
 *                           example: 1500
 *                         artist:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 3
 *                             nick_name:
 *                               type: string
 *                               example: "Artist Name"
 *                             bio:
 *                               type: string
 *                               example: "بیوگرافی آرتیست"
 *       401:
 *         description: نیاز به احراز هویت
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
 *                   example: Unauthorized
 *       403:
 *         description: دسترسی غیرمجاز (فقط ادمین)
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
 *                   example: Access denied. Admin only.
 *       404:
 *         description: گزارش پیدا نشد
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
 *                   example: Report not found
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
 *                   example: server error
 *                 error:
 *                   type: string
 */
reportMusic.get(
  "/reports/:id",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);

      if (isNaN(reportId)) {
        return res.status(400).json({
          status: false,
          message: "Invalid report ID",
        });
      }

      const reportRepository = AppDataSource.getRepository(SongReport);

      const userId = (req as any).user.user_id;
      const report = await reportRepository
        .createQueryBuilder("songReport")
        .leftJoinAndSelect("songReport.user", "user")
        .leftJoinAndSelect("songReport.song", "song")
        .where("songReport.id = :reportId", { reportId })
        .andWhere("user.id = :userId", { userId: userId })
        .select([
          "songReport.id",
          "songReport.is_report",
          "songReport.createdAt",
          "songReport.updatedAt",
          "user.id",
          "song.id",
        ])
        .getOne();

      if (!report) {
        return res.status(404).json({
          status: false,
          message: "Report not found",
        });
      }

      const simpleData = {
        id: report.id,
        song_id: report.song.id,
        user_id: report.user.id,
        created_at: report.createdAt,
        is_report: report.is_report
      }

      return res.status(200).json({
        status: "success",
        data: simpleData,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);
