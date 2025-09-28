import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { Genre } from "../../../../entity/Genre";
import { Album } from "../../../../entity/Album";
import { plainToClass } from "class-transformer";
import { CreateAlbumDto, UpdateAlbumDto } from "../../../../dtos/music/CreateAlbumDto";
import { validate } from "class-validator";
import { In } from "typeorm";
import { User } from "../../../../entity/User";
import { Image } from "../../../../entity/Image";


export const albumRouter = Router();


/**
 * @swagger
 * /v1/album/user/{genre_id}/albums/:
 *   get:
 *     summary: دریافت آلبوم‌های یک ژانر خاص
 *     description: |
 *       این endpoint برای دریافت لیست آلبوم‌های مرتبط با یک ژانر خاص استفاده می‌شود.
 *       فقط آلبوم‌های فعال را برمی‌گرداند و شامل اطلاعات محدودی از هر آلبوم می‌شود.
 *     tags: [Albums]
 *     parameters:
 *       - in: path
 *         name: genre_id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: شناسه یکتای ژانر
 *     responses:
 *       200:
 *         description: لیست آلبوم‌ها با موفقیت بازگردانده شد
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
 *                         description: شناسه آلبوم
 *                         example: 1
 *                       title:
 *                         type: string
 *                         description: عنوان آلبوم
 *                         example: "نجواهای شب"
 *                       cover_image:
 *                         type: object
 *                         description: اطلاعات تصویر کاور
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: شناسه تصویر
 *                             example: 5
 *                           image_path:
 *                             type: string
 *                             description: مسیر فایل تصویر
 *                             example: "/images/covers/cover1.jpg"
 *       404:
 *         description: ژانر مورد نظر یافت نشد
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
 *                   example: "genre not found"
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
albumRouter.get(
    "/:genre_id/albums/",
    async (req: Request, res: Response) => {
        try {
            const genreId = parseInt(req.params.genre_id);
            
            const genreRepository = AppDataSource.getRepository(Genre);
            const genre = await genreRepository.findOne({
                where: { id: genreId, is_active: true },
                select: {id: true}
            });

            if (!genre) {
                return res.status(404).json({
                    status: "error",
                    message: "genre not found"
                });
            }

            const albumRepository = AppDataSource.getRepository(Album);
            
            const albums = await albumRepository
                .createQueryBuilder("album")
                .innerJoin("album.genres", "genre", "genre.id = :genreId", { genreId })
                .leftJoinAndSelect("album.cover_image", "cover_image")
                .where("album.is_active = :isActive", { isActive: true })
                .select([
                    "album.id",
                    "album.title",
                    // "album.bio",
                    // "album.release_date",
                    "cover_image.id",
                    "cover_image.image_path",
                    // "genre.id"
                ])
                .getMany();

            return res.status(200).json({
                status: "success",
                data: albums
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// create album
/**
 * @swagger
 * /v1/album/user/create_album:
 *   post:
 *     summary: ایجاد آلبوم جدید
 *     description: |
 *       این endpoint برای ایجاد یک آلبوم جدید توسط هنرمند استفاده می‌شود.
 *       کاربر باید هنرمند باشد و احراز هویت شده باشد.
 *     tags:
 *       - Albums
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAlbumDto'
 *           example:
 *             title: "آلبوم جدید"
 *             bio: "این یک آلبوم جدید است"
 *             cover_image: 1
 *             release_date: "2023-12-01"
 *             genre_ids: [1, 2, 3]
 *             is_active: true
 *     responses:
 *       201:
 *         description: آلبوم با موفقیت ایجاد شد
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
 *                       example: "آلبوم جدید"
 *                     id:
 *                       type: number
 *                       example: 1
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   status: false
 *                   message: "request body is required"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "invalid data"
 *                   error:
 *                     - field: "title"
 *                       value: { isString: "title must be a string", isNotEmpty: "title should not be empty" }
 *       403:
 *         description: کاربر هنرمند نیست یا حساب غیرفعال است
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
 *               message: "you are not artist"
 *       404:
 *         description: تصویر یا ژانر یافت نشد
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
 *               imageNotFound:
 *                 value:
 *                   status: false
 *                   message: "image not found"
 *               genreNotFound:
 *                 value:
 *                   status: false
 *                   message: "genre not found"
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
albumRouter.post(
    "/create_album/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // validate req body
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                )
            }

            // dto
            const createAlbumDto = plainToClass(CreateAlbumDto, req.body);
            const errors = await validate(createAlbumDto);
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

            // check user
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_artist: true, is_active: true},
                    select: ['id']
                }
            );
            if (!getUser) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "you are not artist"
                    }
                )
            }
            
            // check cover image
            const imageRepository = AppDataSource.getRepository(Image);
            const getImage = await imageRepository.findOne(
                {
                    where:  {id: createAlbumDto.cover_image, user: getUser},
                    select: ['id']
                }
            );
            if (!getImage) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "image not found"
                    }
                )
            }

            // check genre
            const genreRepository = AppDataSource.getRepository(Genre);
            const genre = await genreRepository.find({
                where: {
                    id: In(createAlbumDto.genre_ids),
                    is_active: true
                },
                select: ['id']
            });
            if (!genre) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "genre not found"
                    }
                )
            }

            // create album
            const album = new Album();
            album.title = createAlbumDto.title;
            album.bio = createAlbumDto.bio;
            album.cover_image = getImage;
            album.release_date = new Date(createAlbumDto.release_date);
            // album.genre = genre;
            album.user = getUser;

            // save album
            await album.save();

            return res.status(201).json(
                {
                    status: "success",
                    data: {
                        title: album.title,
                        id: album.id,
                    }
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

// update album
/**
 * @swagger
 * /v1/album/user/update_album/{id}:
 *   patch:
 *     summary: به‌روزرسانی آلبوم
 *     description: |
 *       این endpoint برای به‌روزرسانی آلبوم موجود توسط هنرمند استفاده می‌شود.
 *       کاربر باید هنرمند باشد و احراز هویت شده باشد.
 *       فقط فیلدهای ارسال شده به‌روزرسانی می‌شوند.
 *     tags:
 *       - Albums
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه آلبوم برای به‌روزرسانی
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAlbumDto'
 *           example:
 *             title: "آلبوم ویرایش شده"
 *             bio: "این آلبوم ویرایش شده است"
 *             cover_image: 2
 *             release_date: "2024-01-01"
 *             genre_ids: [1, 4]
 *             is_active: false
 *     responses:
 *       200:
 *         description: آلبوم با موفقیت به‌روزرسانی شد
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
 *                   example: "Album updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 1
 *                     title:
 *                       type: string
 *                       example: "آلبوم ویرایش شده"
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             example:
 *               status: false
 *               message: "invalid data"
 *               error:
 *                 - field: "title"
 *                   value: { isString: "title must be a string" }
 *       403:
 *         description: کاربر هنرمند نیست یا دسترسی ندارد
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
 *               notArtist:
 *                 value:
 *                   status: false
 *                   message: "you are not artist"
 *               notOwner:
 *                 value:
 *                   status: false
 *                   message: "you are not the owner of this album"
 *       404:
 *         description: آلبوم، تصویر یا ژانر یافت نشد
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
 *               albumNotFound:
 *                 value:
 *                   status: false
 *                   message: "album not found"
 *               imageNotFound:
 *                 value:
 *                   status: false
 *                   message: "image not found"
 *               genreNotFound:
 *                 value:
 *                   status: false
 *                   message: "genre not found"
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
albumRouter.patch(
    "/update_album/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const albumId = parseInt(req.params.id);
            
            // validate req body
            if (!req.body) {
                return res.status(400).json({
                    status: false,
                    message: "request body is required"
                });
            }

            // dto
            const updateAlbumDto = plainToClass(UpdateAlbumDto, req.body);
            const errors = await validate(updateAlbumDto, { skipMissingProperties: true });
            
            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "invalid data",
                    error: errors.map(error => ({
                        field: error.property,
                        value: error.constraints
                    }))
                });
            }

            // check user
            const userId = (req as any).user.user_id;
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne({
                where: { id: userId, is_artist: true, is_active: true },
                select: ['id']
            });
            
            if (!getUser) {
                return res.status(403).json({
                    status: false,
                    message: "you are not artist"
                });
            }

            // check if album exists and belongs to user
            const albumRepository = AppDataSource.getRepository(Album);
            const existingAlbum = await albumRepository.findOne({
                where: { id: albumId, user: { id: getUser.id } },
                relations: ['genre', 'cover_image']
            });

            if (!existingAlbum) {
                return res.status(404).json({
                    status: false,
                    message: "album not found"
                });
            }

            // update fields if provided
            if (updateAlbumDto.title !== undefined) {
                existingAlbum.title = updateAlbumDto.title;
            }

            if (updateAlbumDto.bio !== undefined) {
                existingAlbum.bio = updateAlbumDto.bio;
            }

            if (updateAlbumDto.is_active !== undefined) {
                existingAlbum.is_active = updateAlbumDto.is_active;
            }

            if (updateAlbumDto.release_date !== undefined) {
                existingAlbum.release_date = new Date(updateAlbumDto.release_date);
            }

            // update cover image if provided
            if (updateAlbumDto.cover_image !== undefined) {
                const imageRepository = AppDataSource.getRepository(Image);
                const getImage = await imageRepository.findOne({
                    where: { id: updateAlbumDto.cover_image, user: getUser },
                    select: ['id']
                });

                if (!getImage) {
                    return res.status(404).json({
                        status: false,
                        message: "image not found"
                    });
                }
                existingAlbum.cover_image = getImage;
            }

            // update genres if provided
            if (updateAlbumDto.genre_id !== undefined) {
                const genreRepository = AppDataSource.getRepository(Genre);
                const genre = await genreRepository.find({
                    where: {
                        id: updateAlbumDto.genre_id,
                        is_active: true
                    },
                    select: ['id']
                });

                if (!genre) {
                    return res.status(404).json({
                        status: false,
                        message: "genre not found"
                    });
                }
                // existingAlbum.genre = genre
            }

            // save updated album
            await albumRepository.save(existingAlbum);

            return res.status(200).json({
                status: "success",
                message: "Album updated successfully",
                data: {
                    id: existingAlbum.id,
                    title: existingAlbum.title,
                    bio: existingAlbum.bio,
                    release_date: existingAlbum.release_date
                }
            });

        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// get my albums
/**
 * @swagger
 * /v1/album/user/my_album:
 *   get:
 *     summary: دریافت آلبوم‌های کاربر هنرمند
 *     description: |
 *       این endpoint برای دریافت لیست آلبوم‌های کاربر هنرمند با قابلیت صفحه‌بندی استفاده می‌شود.
 *       کاربر باید هنرمند باشد و احراز هویت شده باشد.
 *     tags:
 *       - Albums
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
 *         description: لیست آلبوم‌های کاربر با موفقیت بازگردانده شد
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
 *                     $ref: '#/components/schemas/Album'
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی
 *                   example: 1
 *                 skip:
 *                   type: integer
 *                   description: تعداد آیتم‌های رد شده
 *                   example: 0
 *                 limit:
 *                   type: integer
 *                   description: تعداد آیتم‌ها در هر صفحه
 *                   example: 20
 *                 total:
 *                   type: integer
 *                   description: تعداد کل آلبوم‌ها
 *                   example: 15
 *       403:
 *         description: کاربر هنرمند نیست یا دسترسی ندارد
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
 *               message: "you are not permission this route"
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
albumRouter.get(
    "/my_album/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne({
                where: { 
                    id: (req as any).user.user_id, 
                    is_active: true, 
                    is_artist: true 
                },
                select: ['id']
            });

            if (!getUser) {
                return res.status(403).json({
                    status: false,
                    message: "you are not permission this route"
                });
            }

            // pagination
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const skip = (page - 1) * limit;

            const albumRepository = AppDataSource.getRepository(Album);
            
            const queryBuilder = albumRepository
                .createQueryBuilder("album")
                .leftJoinAndSelect("album.genres", "genre")
                .leftJoinAndSelect("album.cover_image", "cover_image")
                .where("album.user_id = :userId", { userId: getUser.id })
                .andWhere("album.is_active = :isActive", { isActive: true })
                .select([
                    "album.id",
                    "album.title",
                    "album.bio",
                    "album.is_active",
                    "album.release_date",
                    "genre.id",
                    "genre.name",
                    "genre.description",
                    "cover_image.image_path"
                ])
                .skip(skip)
                .take(limit);

            const [myAlbum, total] = await queryBuilder.getManyAndCount();

            return res.status(200).json({
                status: "success",
                data: myAlbum,
                page: page,
                skip: skip,
                limit: limit,
                total: total
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// get all albums with search
albumRouter.get(
    "/album_list/",
    async (req: Request, res: Response) => {
        try {
            // pagination and search parameters
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;
            const genreId = parseInt(req.query.genre as string);
            const skip = (page - 1) * limit;

            const albumRepository = AppDataSource.getRepository(Album);
            
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);