import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * @swagger
 * components:
 *   schemas:
 *     SignUpUserDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - username
 *         - is_artist
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: آدرس ایمیل کاربر
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: رمز عبور کاربر
 *           example: "Password123!"
 *         username:
 *           type: string
 *           description: نام کاربری
 *           example: "john_doe"
 *         is_artist:
 *           type: boolean
 *           description: آیا کاربر هنرمند است؟
 *           example: true
 */
class SignUpUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsBoolean()
    @IsOptional()
    is_artist?: boolean

}

export {
    SignUpUserDto
}
