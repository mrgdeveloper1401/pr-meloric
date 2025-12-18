import { Router, Request, Response } from "express";
import { AppDataSource } from "../../../../data-source";
import { Song } from "../../../../entity/Song";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { FavoriteSong } from "../../../../entity/FavoriteSong";


export const bestMusicRouter = Router();


/**
 * @swagger
 * /v1/best/user/music/best_music/:
 *   get:
 *     summary: Get best music
 *     description: |
 *       Retrieve a list of random active songs with complete details including artist, album, and audio information.
 *       The number of songs can be customized via query parameter (default 20, max 100).
 *       Each response includes an "is_owner" field indicating if the authenticated user owns the song.
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
 *                         example: 1
 *                       is_owner:
 *                         type: boolean
 *                         description: Indicates if the authenticated user is the owner/artist of the song
 *                         example: false
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
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T00:00:00.000Z"
 *                       image:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           image_path:
 *                             type: string
 *                             example: "/images/songs/bohemian.jpg"
 *                       album:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           title:
 *                             type: string
 *                             example: "A Night at the Opera"
 *                           cover_image:
 *                             type: string
 *                             nullable: true
 *                             example: "/images/albums/opera.jpg"
 *                       artist:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           nick_name:
 *                             type: string
 *                             nullable: true
 *                             example: "Queen"
 *                           first_name:
 *                             type: string
 *                             nullable: true
 *                             example: "Freddie"
 *                           last_name:
 *                             type: string
 *                             nullable: true
 *                             example: "Mercury"
 *                           username:
 *                             type: string
 *                             example: "queen_official"
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
 *                       audio:
 *                         type: object
 *                         properties:
 *                           audio_file_path:
 *                             type: string
 *                             example: "/audio/bohemian_rhapsody.mp3"
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
bestMusicRouter.get(
    "/best_music/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            const musicRepository = AppDataSource.getRepository(Song);
            
            const count = Math.min(parseInt(req.query.count as string) || 20, 100);
            const releaseDate = new Date();
            
            const randomMusics = await musicRepository
                .createQueryBuilder("song")
                .select([
                    "song.id",
                    "song.title",
                    "song.release_date",
                    "song.play_count",
                    "song.music_lyrics",
                    "song.createdAt",
                    "song.updatedAt"
                ])
                .leftJoinAndSelect("song.artist", "artist")
                .leftJoin("artist.user", "user")
                .addSelect([
                    "artist.id",
                    "artist.nick_name",
                    "user.first_name",
                    "user.last_name",
                    "user.id",
                    "user.username"
                ])
                .leftJoinAndSelect("user.cover_image", "artist_cover_image")
                .addSelect([
                    "artist_cover_image.id",
                    "artist_cover_image.image_path"
                ])
                .leftJoinAndSelect("song.album", "album")
                .addSelect([
                    "album.id",
                    "album.title"
                ])
                .leftJoin("album.cover_image", "album_cover_image")
                .addSelect("album_cover_image.image_path")
                .leftJoinAndSelect("song.audio", "audio")
                .addSelect([
                    "audio.audio_file_path",
                    "audio.audio_format"
                ])
                .leftJoinAndSelect("song.image", "song_image")
                .addSelect("song_image.image_path")
                .where("song.is_active = :isActive", { isActive: true })
                .andWhere("audio.is_active = :audioIsActive", { audioIsActive: true })
                .andWhere("song.release_date < :releaseDate", { releaseDate })
                .orderBy("RANDOM()")
                .limit(count)
                .getMany();
            
            if (randomMusics.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "No active songs found"
                });
            }
            
            const response = randomMusics.map(song => {
                const isOwner = song.artist?.user?.id === userId;
                
                return {
                    id: song.id,
                    is_owner: isOwner,
                    title: song.title,
                    release_date: song.release_date,
                    play_count: song.play_count,
                    music_lyrics: song.music_lyrics,
                    created_at: song.createdAt,
                    image: song.image ? {
                        image_path: song.image.image_path
                    } : null,
                    album: song.album ? {
                        id: song.album.id,
                        title: song.album.title,
                        cover_image: (song.album as any).cover_image?.image_path || null
                    } : null,
                    artist: song.artist ? {
                        id: song.artist.id,
                        nick_name: song.artist.nick_name,
                        first_name: song.artist.user?.first_name || null,
                        last_name: song.artist.user?.last_name || null,
                        username: song.artist.user?.username || null,
                        cover_image: song.artist.user.cover_image ? {
                            id: song.artist.user.cover_image.id,
                            image_path: song.artist.user.cover_image.image_path
                        } : null
                    } : null,
                    audio: song.audio ? {
                        audio_file_path: song.audio.audio_file_path,
                        audio_format: song.audio.audio_format
                    } : null
                };
            });

            return res.json({
                status: "success",
                data: response
            });

        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                message: "Internal server error" 
            });
        }
    }
);