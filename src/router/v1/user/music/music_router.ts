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
import { error } from "console";
import { Artist } from "../../../../entity/Artist";


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
                    where: {album: getAlbum},
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
            const userId = (req as any).user.use_id;
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
                    where: {id: createMusicDto.audio_id, user: getUser, is_active: true},
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
                    where: {id: parseInt(req.params.album_id)},
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
                    where: {user: getUser, is_active: true},
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
