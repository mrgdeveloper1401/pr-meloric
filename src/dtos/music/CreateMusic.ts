import { IsNotEmpty, IsNumber, IsString } from "class-validator";

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateMusicRequest:
 *       type: object
 *       required:
 *         - audio_id
 *         - title
 *         - release_date
 *       properties:
 *         audio_id:
 *           type: integer
 *           description: شناسه فایل صوتی
 *         title:
 *           type: string
 *           description: عنوان موسیقی
 *         release_date:
 *           type: string
 *           format: date
 *           description: تاریخ انتشار
 */
export class CreateMusicDto {
    @IsNumber()
    @IsNotEmpty()
    audio_id: number;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    release_date: string
}