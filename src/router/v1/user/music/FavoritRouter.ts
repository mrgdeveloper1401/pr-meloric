import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { plainToClass } from "class-transformer";
import { favoriteMusicDto } from "../../../../dtos/music/FavoritMusicDto";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { FavoriteSong } from "../../../../entity/FavoriteSong";
import { Song } from "../../../../entity/Song";

export const favoriteRouter = Router();

// create favorite music
/**
 * @swagger
 * /v1/user/favorite/create_favorite_music:
 *   post:
 *     summary: افزودن موزیک به لیست علاقه‌مندی‌ها
 *     description: این endpoint برای افزودن یک موزیک به لیست علاقه‌مندی‌های کاربر استفاده می‌شود
 *     tags: [Favorite]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - music_id
 *             properties:
 *               music_id:
 *                 type: integer
 *                 description: شناسه موزیک
 *                 example: 123
 *     responses:
 *       201:
 *         description: موزیک با موفقیت به علاقه‌مندی‌ها اضافه شد
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
 *                   example: "successfully add music"
 *       400:
 *         description: داده‌های نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "music_id"
 *                       value:
 *                         type: object
 *                         properties:
 *                           isNumber:
 *                             type: string
 *                             example: "music_id must be a number"
 *       404:
 *         description: موزیک یافت نشد
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
favoriteRouter.post(
    "/create_favorite_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            // validate data
            const MusicDto = plainToClass(favoriteMusicDto, req.body);
            const errors = await validate(MusicDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
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

            // get song(music)
            const musicRepository = AppDataSource.getRepository(Song);
            const getMusic = await musicRepository.findOne(
                {
                    where: {id: MusicDto.music_id, is_active: true},
                    select: ['id']
                }
            )
            if (!getMusic) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "music not found"
                    }
                );
            }

            // create favorite
            const userId = (req as any).user.user_id;
            const favorite = new FavoriteSong();
            favorite.user = userId;
            favorite.song = getMusic;
            await favorite.save();

            return res.status(201).json(
                {
                    status: "success",
                    message: "successfully add favorite music"
                }
            );
        } catch (error) {
              if (error.code === '23505') {
                return res.status(409).json({
                status: false,
                message: "This music has already been added to favorites."
                });
            }
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }

);

// delete favorite music
/**
 * @swagger
 * /v1/user/favorite/remove_favorite_music/{favorite_music_id}:
 *   delete:
 *     summary: حذف موزیک از لیست علاقه‌مندی‌ها
 *     description: این endpoint برای حذف یک موزیک از لیست علاقه‌مندی‌های کاربر استفاده می‌شود
 *     tags: [Favorite]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: favorite_music_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه موزیک
 *     responses:
 *       200:
 *         description: موزیک با موفقیت از علاقه‌مندی‌ها حذف شد
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
 *                   example: "successfully removed music from favorites"
 *       404:
 *         description: موزیک در لیست علاقه‌مندی‌ها یافت نشد
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
 *                   example: "music not found in favorites"
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
favoriteRouter.delete(
    "/remove_favorite_music/:favorite_music_id/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const favoriteMusicId = parseInt(req.params.favorite_music_id);
            const userId = (req as any).user.user_id;

            const favoriteRepository = AppDataSource.getRepository(FavoriteSong);
            const deleteResult = await favoriteRepository.delete({
                user: { id: userId },
                id: favoriteMusicId
            });

            if (deleteResult.affected === 0) {
                return res.status(404).json({
                    status: false,
                    message: "music not found in favorites"
                });
            }

            return res.status(200).json({
                status: "success",
                message: "successfully removed music from favorites"
            });
        } catch (error) {
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

