import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateAlbumDto:
 *       type: object
 *       required:
 *         - title
 *         - bio
 *         - cover_image
 *         - release_date
 *         - genre_ids
 *       properties:
 *         title:
 *           type: string
 *           description: عنوان آلبوم
 *           example: "آلبوم جدید"
 *         bio:
 *           type: string
 *           description: توضیحات آلبوم
 *           example: "این یک آلبوم جدید است"
 *         cover_image:
 *           type: number
 *           description: شناسه تصویر کاور آلبوم
 *           example: 1
 *         release_date:
 *           type: string
 *           format: date
 *           description: تاریخ انتشار آلبوم (فرمت YYYY-MM-DD)
 *           example: "2023-12-01"
 *         genre_ids:
 *           type: array
 *           items:
 *             type: number
 *           description: آرایه‌ای از شناسه‌های ژانرها
 *           example: [1, 2, 3]
 *       example:
 *         title: "آلبوم جدید"
 *         bio: "این یک آلبوم جدید است"
 *         cover_image: 1
 *         release_date: "2023-12-01"
 *         genre_ids: [1, 2, 3]
 *         is_active: true
 */
export class CreateAlbumDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    bio: string;

    @IsNumber()
    @IsNotEmpty()
    cover_image: number;

    @IsString()
    @IsNotEmpty()
    release_date: string;

    @IsArray()
    @IsNotEmpty()
    genre_ids: number[];

}
