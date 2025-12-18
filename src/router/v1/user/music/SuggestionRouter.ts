import { Request, Response, Express, Router } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { Song } from "../../../../entity/Song";
import { AppDataSource } from "../../../../data-source";

export const suggestRouter = Router();

/**
 * @swagger
 * /v1/suggestion/music/suggest_music/:
 *   get:
 *     summary: Get random music suggestions
 *     description: |
 *       Retrieve a list of random active songs with complete details including artist, album, and audio information.
 *       The number of songs can be customized via query parameter (default 20, max 100).
 *     tags:
 *       - Music
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of random songs to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved random songs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Bohemian Rhapsody"
 *                       release_date:
 *                         type: string
 *                         format: date-time
 *                         example: "1975-10-31T00:00:00.000Z"
 *                       play_count:
 *                         type: integer
 *                         example: 1500
 *                       music_lyrics:
 *                         type: string
 *                         nullable: true
 *                         example: "Is this the real life? Is this just fantasy?..."
 *                       album:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "A Night at the Opera"
 *                           bio:
 *                             type: string
 *                             example: "Fourth studio album by Queen"
 *                           release_date:
 *                             type: string
 *                             format: date-time
 *                             example: "1975-11-21T00:00:00.000Z"
 *                       artist:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           monthly_listeners:
 *                             type: integer
 *                             example: 5000000
 *                           bio:
 *                             type: string
 *                             example: "British rock band formed in London in 1970"
 *                           cover_image:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 1
 *                               image_path:
 *                                 type: string
 *                                 example: "/images/artists/queen.jpg"
 *                               file_name:
 *                                 type: string
 *                                 example: "queen.jpg"
 *                       audio:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           audio_file_path:
 *                             type: string
 *                             example: "/audio/bohemian_rhapsody.mp3"
 *                           duration:
 *                             type: integer
 *                             example: 354
 *                           audio_format:
 *                             type: string
 *                             example: "mp3"
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *       404:
 *         description: No active songs found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: false
 *               message: "No active songs found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Internal server error"
 */
suggestRouter.get(
    "/suggest_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const musicRepository = AppDataSource.getRepository(Song);

            const count = parseInt(req.query.count as string) || 20;

            const randomMusics = await musicRepository
                .createQueryBuilder("song")
                .leftJoinAndSelect("song.artist", "artist")
                .leftJoinAndSelect("artist.user", "user")
                // .leftJoinAndSelect("user.profile", "profile")
                .leftJoinAndSelect("artist.cover_image", "artist_cover_image")
                .leftJoinAndSelect("song.album", "album")
                .leftJoinAndSelect("song.audio", "audio")
                .leftJoinAndSelect("song.image", "image")
                .leftJoinAndSelect("album.cover_image", "album_cover_image")
                .where("song.is_active = :isActive", { isActive: true })
                .andWhere("audio.is_active = :audioIsActive", { audioIsActive: true })
                .orderBy("RANDOM()")
                .limit(count)
                .getMany();

            if (!randomMusics || randomMusics.length === 0) {
                return res.status(404).json({ 
                    status: false, 
                    message: "No active songs found" 
                });
            }

            const response = randomMusics.map(randomMusic => ({
                id: randomMusic.id,
                title: randomMusic.title,
                release_date: randomMusic.release_date,
                play_count: randomMusic.play_count,
                music_lyrics: randomMusic.music_lyrics,
                created_at: randomMusic.createdAt,
                image: {
                    image_path: randomMusic.image?.image_path || null
                },
                album: {
                    id: randomMusic.album?.id || null,
                    title: randomMusic.album?.title || null,
                    // bio: randomMusic.album?.bio,
                    // release_date: randomMusic.album?.release_date,
                    // cover_image: randomMusic.album.cover_image?.image_path || null
                },
                artist: {
                    id: randomMusic.artist?.id,
                    // monthly_listeners: randomMusic.artist?.monthly_listeners,
                    // bio: randomMusic.artist?.bio,
                    nicke_name: randomMusic.artist?.nick_name || null,
                    first_name: randomMusic.artist.user?.first_name || null,
                    last_name: randomMusic.artist.user?.last_name || null,
                    username: randomMusic.artist.user.username,
                    cover_image: {
                        id: randomMusic.artist.user.cover_image?.id || null,
                        image_path: randomMusic.artist.user.cover_image?.image_path || null,
                        // file_name: randomMusic.artist.cover_image.file_name
                    }
                },
                audio: {
                    // id: randomMusic.audio?.id,
                    audio_file_path: randomMusic.audio?.audio_file_path,
                    // duration: randomMusic.audio?.duration,
                    audio_format: randomMusic.audio?.audio_format
                },
            }));

            res.json({
                status: "success",
                count: randomMusics.length,
                data: response
            });

        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: "Internal server error",
                error: error.message
            });
        }
    }
);