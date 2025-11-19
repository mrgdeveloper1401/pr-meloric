import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../data-source";
import { Artist } from "../entity/Artist";


export const isArtistUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const artistRepository = AppDataSource.getRepository(Artist);
        const isAertist = await artistRepository.findOne(
            {
                where: {
                    user: {id: (req as any).user.user_id},
                    is_active: true
                },
                select: {id: true}
            }
        );
        if (!isAertist) {
            return res.status(404).json(
                {
                    status: false,
                    message: "artist not found"
                }
            )
        }
        else {
            (req as any).artist = isAertist;
            next();
        }
    } catch (error) {
        throw new Error(error.message)
    }
}