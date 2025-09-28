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


/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateAlbumDto:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: عنوان آلبوم
 *           example: "آلبوم ویرایش شده"
 *           nullable: true
 *         bio:
 *           type: string
 *           description: توضیحات آلبوم
 *           example: "این آلبوم ویرایش شده است"
 *           nullable: true
 *         cover_image:
 *           type: number
 *           description: شناسه تصویر کاور آلبوم
 *           example: 2
 *           nullable: true
 *         release_date:
 *           type: string
 *           format: date
 *           description: تاریخ انتشار آلبوم (فرمت YYYY-MM-DD)
 *           example: "2024-01-01"
 *           nullable: true
 *         genre_ids:
 *           type: array
 *           items:
 *             type: number
 *           description: آرایه‌ای از شناسه‌های ژانرها
 *           example: [1, 4]
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           description: وضعیت فعال بودن آلبوم
 *           example: false
 *           nullable: true
 *       example:
 *         title: "آلبوم ویرایش شده"
 *         bio: "این آلبوم ویرایش شده است"
 *         cover_image: 2
 *         release_date: "2024-01-01"
 *         genre_ids: [1, 4]
 *         is_active: false
 */
export class UpdateAlbumDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    title?: string

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    bio?: string;

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    cover_image?: number;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    release_date?: string;

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    genre_id?: number;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
