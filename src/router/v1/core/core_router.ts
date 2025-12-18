import express from "express";
import { AppDataSource } from "../../../data-source";
import { PublicNotification } from "../../../entity/publicNotification";
import { Request, Response } from "express";
import { authenticateJWT } from "../../../middlewares/authenticate";
import { Image } from "../../../entity/Image";
import path from "path";
import fs from "fs";
import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { audioUpload, s3ClientConfig, upload } from "../../../utils/amazon_s3/S3Config";
import { Audio } from "../../../entity/Audio";
import { User } from "../../../entity/User";


export const coreRouter = express.Router();

// all public notification
/**
 * @swagger
 * /v1/user/core/public_notifications:
 *   get:
 *     summary: دریافت لیست نوتیفیکیشن‌های عمومی
 *     description: |
 *       این endpoint برای دریافت لیست نوتیفیکیشن‌های عمومی با قابلیت صفحه‌بندی استفاده می‌شود.
 *       نیاز به احراز هویت ندارد.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه برای صفحه‌بندی
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
 *         description: لیست نوتیفیکیشن‌های عمومی با موفقیت بازگردانده شد
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
 *                   description: تعداد کل نوتیفیکیشن‌ها
 *                   example: 150
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 total_page:
 *                   type: integer
 *                   description: تعداد کل صفحات
 *                   example: 8
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه نوتیفیکیشن
 *                         example: 1
 *                       title:
 *                         type: string
 *                         description: عنوان نوتیفیکیشن
 *                         example: "به روزرسانی سیستم"
 *                       notification_redirect_url:
 *                         type: string
 *                         nullable: true
 *                         description: URL جهت redirect
 *                         example: "https://example.com/update"
 *                       notification_type:
 *                         type: string
 *                         description: نوع نوتیفیکیشن
 *                         example: "system_update"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: تاریخ ایجاد
 *                         example: "2023-12-01T10:30:00.000Z"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
coreRouter.get(
    "/public_notifications/",
    async (req: Request, res: Response) => {
        try {
            const requestParams = req.query; // params
            const limit = parseInt(requestParams.limit as string) || 20; // get limit in params
            const page = parseInt(requestParams.page as string) || 1;
            const skip = (page - 1) * limit;
            const publicNotificationRepository = AppDataSource.getRepository(PublicNotification);
            const [publicNotification, total] = await publicNotificationRepository.findAndCount(
                {
                    where: {is_active: true},
                    take: limit || 20,
                    skip: skip,
                    select: ['id', "title", "notification_redirect_url", "notification_type", "createdAt"]
                }
            )
            return res.status(200).json(
                {
                    status: "success",
                    total: total,
                    limit: limit,
                    page: page,
                    total_page: Math.ceil(total / limit),
                    data: publicNotification
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
)


// detail public notification
/**
 * @swagger
 * /v1/user/core/public_notifications/{id}:
 *   get:
 *     summary: دریافت جزئیات نوتیفیکیشن عمومی
 *     description: |
 *       این endpoint برای دریافت جزئیات کامل یک نوتیفیکیشن عمومی استفاده می‌شود.
 *       نیاز به احراز هویت ندارد.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه نوتیفیکیشن
 *         example: 1
 *     responses:
 *       200:
 *         description: جزئیات نوتیفیکیشن با موفقیت بازگردانده شد
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
 *                       description: شناسه نوتیفیکیشن
 *                       example: 1
 *                     title:
 *                       type: string
 *                       description: عنوان نوتیفیکیشن
 *                       example: "به روزرسانی سیستم"
 *                     body:
 *                       type: string
 *                       description: محتوای کامل نوتیفیکیشن
 *                       example: "سیستم در تاریخ ۱۴۰۲/۱۲/۰۱ به روزرسانی خواهد شد."
 *                     notification_redirect_url:
 *                       type: string
 *                       nullable: true
 *                       description: URL جهت redirect
 *                       example: "https://example.com/update"
 *                     notification_type:
 *                       type: string
 *                       description: نوع نوتیفیکیشن
 *                       example: "system_update"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: تاریخ ایجاد
 *                       example: "2023-12-01T10:30:00.000Z"
 *       404:
 *         description: نوتیفیکیشن یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *             example:
 *               status: "error"
 *               message: "Notification not found"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
coreRouter.get(
    "/public_notifications/:id",
    async (req: Request, res: Response) => {
        try {
            const publicNotificationRepository = AppDataSource.getRepository(PublicNotification);
            const getPublicNotification = await publicNotificationRepository.findOne(
                {
                    where: {
                        is_active: true,
                        id: Number(req.params.id),
                    },
                    select: ['id', "body", "notification_redirect_url", "title", "notification_type", "createdAt"]
                }
            )
            if (getPublicNotification === null){
                return res.status(204).json(
                    {
                        status: "success",
                        data: null
                    }
                )
            }else{
                return res.status(200).json(
                    {
                        status: "success",
                        data: getPublicNotification
                    }
                );
            }
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error",
                    error: error.message
                }
            )   
        }
    }
)

// upload image
/**
 * @swagger
 * /v1/user/core/upload_image/:
 *   post:
 *     summary: آپلود تصویر
 *     description: |
 *       این endpoint برای آپلود فایل تصویر استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Images
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: فایل تصویر برای آپلود
 *     responses:
 *       201:
 *         description: تصویر با موفقیت آپلود شد
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
 *                       description: شناسه تصویر در دیتابیس
 *                       example: 123
 *                     image_path:
 *                       type: string
 *                       description: URL عمومی تصویر آپلود شده
 *                       example: "https://bucket-name.s3.ir-thr-at1.arvanstorage.ir/uploads/456/filename.jpg"
 *       400:
 *         description: فایل یافت نشد
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
 *                   example: "file unload not found"
 *       401:
 *         description: عدم احراز هویت
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
 *                   example: "Unauthorized"
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
 *                   type: object
 *                   description: اطلاعات خطا (در حالت development)
 */
coreRouter.post(
    "/upload_image/",
    authenticateJWT,
    upload.single("file"),
    async (req: Request, res: Response) => {
        try {
            // validate data
            if (!req.file) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "file unload not found"
                    }
                );
            }

            // read file on disk
            const fileContent = fs.readFileSync(req.file.path);
            const userId = (req as any).user.user_id;
            const params: PutObjectCommandInput = {
                ACL: "public-read",
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `uploads/${userId}/${req.file.filename}.${req.file.mimetype.split('image/')[1]}`,
                Body: fileContent,
                ContentType: req.file.mimetype,

            }

            // upload in s3
            const command = new PutObjectCommand(params);
            await s3ClientConfig.send(command);

            // remove file in memory
            fs.unlinkSync(req.file.path);

            // save on database
            const file = req.file; // get file
            const imageRepository = AppDataSource.getRepository(Image);
            const newImage = new Image();
            newImage.file_name = file.originalname;
            newImage.image_path = `https://${process.env.AWS_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${params.Key}`;
            newImage.format = path.extname(file.originalname).replace('.', '');
            newImage.type = file.mimetype;
            newImage.size = file.size;
            newImage.user = userId;
            const savedImage = await imageRepository.save(newImage);

            return res.status(201).json(
                {
                    status: "success",
                    data : {
                        id: savedImage.id,
                        image_path: savedImage.image_path
                    }
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error",
                    error: error
                }
            )
        }
    }
);

// get image by user
/**
 * @swagger
 * /v1/user/core/image_uploads_user:
 *   get:
 *     summary: دریافت تصاویر آپلود شده توسط کاربر
 *     description: |
 *       این endpoint برای دریافت لیست تصاویر آپلود شده توسط کاربر با قابلیت صفحه‌بندی استفاده می‌شود.
 *       کاربر باید احراز هویت شده باشد.
 *     tags:
 *       - Images
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
 *         description: لیست تصاویر کاربر با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 take:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   description: تعداد کل تصاویر
 *                   example: 45
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserImage'
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Unauthorized"
 *       404:
 *         description: کاربر یافت نشد
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
 *             example:
 *               status: false
 *               message: "user not found"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
coreRouter.get(
    "/image_uploads_user/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // pagination data
            const take = parseInt(req.query.limit as string) || 20;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * take 

            // get user
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_active: true},
                    select: ['id']
                }
            )
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                )
            }
            // get data
            const imageRepository = AppDataSource.getRepository(Image);
            const [images, total] = await imageRepository.findAndCount(
                {
                    where: {user: getUser, is_active: true},
                    relations: ['user'],
                    select: {
                        id: true, image_path: true,
                        user: {
                            id: true
                        }
                    },
                    take: Number(take),
                    skip: skip
                }
            );
            return res.status(200).json(
                {
                    status: "success",
                    take: take,
                    total: total,
                    data: images,
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

// delete image by user
/**
 * @swagger
 * /v1/user/core/image_uploads_user/{id}:
 *   delete:
 *     summary: Delete a user's image
 *     description: Delete a specific image belonging to the authenticated user. Requires JWT authentication.
 *     tags:
 *       - Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the image to delete
 *         schema:
 *           type: integer
 *           example: 123
 *     responses:
 *       '200':
 *         description: Image deleted successfully
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
 *                   example: "Image deleted successfully"
 *                 deletedImage:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *       '400':
 *         description: Invalid image ID provided
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
 *                   example: "Invalid image ID"
 *       '401':
 *         description: Unauthorized - JWT token missing or invalid
 *       '404':
 *         description: User or image not found
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
 *                   example: "Image not found or you don't have permission to delete it"
 *       '500':
 *         description: Internal server error
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
 *                   example: "Server error"
 */
coreRouter.delete(
    "/image_uploads_user/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const imageId = parseInt(req.params.id);
            
            if (isNaN(imageId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid image ID"
                });
            }

            // get user
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne({
                where: { id: userId, is_active: true },
                select: ['id']
            });

            if (!getUser) {
                return res.status(404).json({
                    status: false,
                    message: "User not found"
                });
            }

            // find image
            const imageRepository = AppDataSource.getRepository(Image);
            const image = await imageRepository.findOne({
                where: { 
                    id: imageId,
                    is_active: true,
                    user: getUser 
                },
                relations: ['user'],
                select: {
                    user: {
                        id: true
                    },
                    id: true
                }
            });

            if (!image) {
                return res.status(404).json({
                    status: false,
                    message: "Image not found or you don't have permission to delete it"
                });
            }

            // حذف فیزیکی فایل از storage (اگر نیاز باشد)
            // const fs = require('fs');
            // const path = require('path');
            // const filePath = path.join(__dirname, '..', 'uploads', image.image_path);
            // if (fs.existsSync(filePath)) {
            //     fs.unlinkSync(filePath);
            // }

            image.is_active = false;
            await image.save()

            return res.status(200).json({
                status: "success",
                message: "Image deleted successfully",
                deletedImage: {
                    id: image.id
                }
            });

        } catch (error) {
            console.error("Delete image error:", error);
            return res.status(500).json({
                status: false,
                message: "Server error"
            });
        }
    }
);

// upload audio
/**
 * @swagger
 * /v1/user/core/upload_audio/:
 *   post:
 *     summary: آپلود فایل صوتی
 *     description: کاربران هنرمند می‌توانند فایل صوتی آپلود کنند
 *     tags: [Audio]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               music:
 *                 type: string
 *                 format: binary
 *                 description: فایل صوتی (حداکثر ۱۵ مگابایت)
 *     responses:
 *       201:
 *         description: فایل با موفقیت آپلود شد
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
 *                       description: شناسه فایل صوتی در دیتابیس
 *                       example: 123
 *                     file_path:
 *                       type: string
 *                       description: آدرس کامل فایل در سرویس ذخیره‌سازی
 *                       example: https://bucket-name.s3.ir-thr-at1.arvanstorage.ir/uploads/1/filename.mp3
 *                     size:
 *                       type: integer
 *                       description: حجم فایل به بایت
 *                       example: 5242880
 *                     format:
 *                       type: string
 *                       description: فرمت فایل
 *                       example: audio/mpeg
 *       400:
 *         description: خطا در آپلود فایل
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
 *                   example: No file uploaded
 *       403:
 *         description: کاربر مجوز آپلود فایل ندارد
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
 *                   example: you not have permission this route
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
 */
coreRouter.post(
    "/upload_audio/",
    authenticateJWT,
    audioUpload.single("music"),
    async (req: Request, res: Response) => {
        try {
            // check upload file
            if (!req.file) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "No file uploaded"
                    }
                );
            }

            // get user_id by request and check user is artst
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_active: true, is_artist: true},
                    select: ['id']
                }
            )
            if (!getUser) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "you not have permission this route"
                    }
                )
            }

            // parse metadata
            const mm = await import("music-metadata");
            const metadata = await mm.parseFile(req.file.path);
            const durationInSeconds = Math.floor(metadata.format.duration || 0);

            // save in bucket
            const fileContent = fs.readFileSync(req.file.path);
            const params: PutObjectCommandInput = {
                ACL: "public-read",
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `uploads/${userId}/${req.file.filename}.${req.file.originalname.split('.').pop()}`,
                Body: fileContent,
                ContentType: req.file.mimetype,

            }
            const command = new PutObjectCommand(params);
            await s3ClientConfig.send(command);

            // create record and save into database
            const audio = new Audio();
            audio.audio_file_path = `https://${process.env.AWS_BUCKET_NAME}.s3.ir-thr-at1.arvanstorage.ir/${params.Key}`;
            audio.size = req.file.size;
            audio.audio_format = req.file.mimetype || req.file.originalname.split('.').pop() || '';
            audio.is_active = true;
            audio.hash = crypto.randomUUID();
            audio.user = getUser;
            audio.duration = durationInSeconds;

            // save into database
            const saveAudio = await Audio.save(audio);

            // remove file in memory
            fs.unlinkSync(req.file.path);
            
            // return data
            return res.status(201).json(
                {
                    status: "success",
                    data: {
                        id: saveAudio.id,
                        file_path: saveAudio.audio_file_path,
                        size: saveAudio.size,
                        format: saveAudio.audio_format
                    }
                }
            );
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

// my upload audio
/**
 * @swagger
 * /v1/user/core/my_audio:
 *   get:
 *     summary: دریافت لیست فایل‌های صوتی کاربر هنرمند
 *     description: این endpoint برای دریافت لیست فایل‌های صوتی کاربر هنرمند با قابلیت صفحه‌بندی استفاده می‌شود
 *     tags: [Audio]
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
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه
 *     responses:
 *       200:
 *         description: موفقیت آمیز
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
 *                     $ref: '#/components/schemas/Audio'
 *       403:
 *         description: عدم دسترسی - کاربر هنرمند نیست
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
coreRouter.get(
    "/my_audio/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_active: true, is_artist: true},
                    select: ['id']
                }
            );
            if (!getUser) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "you do not have permission this route"
                    }
                );
            }

            // pagination
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            // audio
            const audioRepository = AppDataSource.getRepository(Audio);
            const [audios, total] = await audioRepository.findAndCount(
                {
                    where: {
                        is_active: true,
                        user: {id: userId}
                    },
                    relations: ['user'],
                    take: limit,
                    skip: skip,
                    select: {
                        id: true,
                        audio_file_path: true,
                        size: true,
                        hash: true,
                        user: {
                            id: true
                        }
                    }
                }
            );

            return res.status(200).json(
                {
                    status: "success",
                    page: page,
                    limit: limit,
                    total: total,
                    skip: skip,
                    data: audios,
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

// delete route my_upload audio
/**
 * @swagger
 * /v1/user/core/my_audio/{id}:
 *   delete:
 *     summary: حذف فایل صوتی کاربر هنرمند
 *     description: |
 *       این endpoint برای حذف یک فایل صوتی خاص کاربر هنرمند استفاده می‌شود.
 *       کاربر باید هنرمند باشد و فقط می‌تواند فایل‌های صوتی خود را حذف کند.
 *     tags: [Audio]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه فایل صوتی
 *         example: 123
 *     responses:
 *       200:
 *         description: فایل صوتی با موفقیت حذف شد
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
 *                   example: "Audio file deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *       400:
 *         description: شناسه فایل صوتی نامعتبر است
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
 *                   example: "Invalid audio ID"
 *       403:
 *         description: عدم دسترسی - کاربر هنرمند نیست یا مالک فایل نیست
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
 *                   example: "You don't have permission to delete this audio"
 *       404:
 *         description: فایل صوتی پیدا نشد
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
 *                   example: "Audio file not found"
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
coreRouter.delete(
    "/my_audio/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user
            const userId = (req as any).user.user_id;
            const audioId = parseInt(req.params.id);

            // check valid params
            if (isNaN(audioId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid audio ID"
                });
            }

            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne({
                where: { id: userId, is_active: true, is_artist: true },
                select: ['id']
            });

            if (!getUser) {
                return res.status(403).json({
                    status: false,
                    message: "You do not have permission to access this route"
                });
            }

            // find file
            const audioRepository = AppDataSource.getRepository(Audio);
            const audio = await audioRepository.findOne({
                where: {
                    id: audioId,
                    user: { id: userId },
                    is_active: true
                },
                relations: ['user']
            });

            if (!audio) {
                return res.status(404).json({
                    status: false,
                    message: "Audio file not found or you don't have permission to delete it"
                });
            }

            // soft delete
            audio.is_active = false;
            await audioRepository.save(audio);

            return res.status(200).json({
                status: "success",
                message: "Audio file deleted successfully",
                data: {
                    id: audio.id,
                }
            });

        } catch (error) {
            console.error("Delete audio error:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);