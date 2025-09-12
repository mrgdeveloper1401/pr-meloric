/**
 * @swagger
 * components:
 *   schemas:
 *     RefreshTokenResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         token:
 *           type: string
 *           description: New access token
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *               value:
 *                 type: object
 * 
 *     ValidationError:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 *         value:
 *           type: object
 * 
 *     UnauthorizedError:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Unauthorized"
 */

// get profile
/**
 * @swagger
 * components:
 *   schemas:
 *     ProfileResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         birth_date:
 *           type: string
 *           format: date
 *         bio:
 *           type: string
 *         jobs:
 *           type: array
 *           items:
 *             type: string
 *         social:
 *           type: array
 *           items:
 *             type: string
 *         profile_image:
 *           $ref: '#/components/schemas/ImageResponse'
 *         banner_image:
 *           $ref: '#/components/schemas/ImageResponse'
 *         banner_galery_image:
 *           $ref: '#/components/schemas/ImageResponse'
 *         user:
 *           $ref: '#/components/schemas/UserInfoResponse'
 * 
 *     ImageResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         image_path:
 *           type: string
 * 
 *     UserInfoResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         is_artist:
 *           type: boolean
 *         is_public:
 *           type: boolean
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error message
 */

// update profile
/**
 * @swagger
 * components:
 *   schemas:     
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         first_name:
 *           type: string
 *           nullable: true
 *         last_name:
 *           type: string
 *           nullable: true
 *         birth_date:
 *           type: string
 *           format: date
 *           nullable: true
 *         bio:
 *           type: string
 *           nullable: true
 *         jobs:
 *           type: array
 *           items:
 *             type: string
 *         social:
 *           type: array
 *           items:
 *             type: string
 *         profile_image_id:
 *           type: integer
 *           nullable: true
 *         banner_image_id:
 *           type: integer
 *           nullable: true
 *         banner_galery_image_id:
 *           type: integer
 *           nullable: true
 */

// base user
/**
 * @swagger
 * components:
 *   schemas:    
 *     BaseUserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: شناسه کاربر
 *         mobile_phone:
 *           type: string
 *           nullable: true
 *           description: شماره موبایل
 *         email:
 *           type: string
 *           format: email
 *           description: آدرس ایمیل
 *         username:
 *           type: string
 *           description: نام کاربری
 *         is_active:
 *           type: boolean
 *           description: وضعیت فعال بودن حساب
 *         is_staff:
 *           type: boolean
 *           description: وضعیت کارمند بودن
 *         is_superuser:
 *           type: boolean
 *           description: وضعیت ابرکاربر بودن
 *         is_artist:
 *           type: boolean
 *           description: وضعیت هنرمند بودن
 *         is_public:
 *           type: boolean
 *           description: وضعیت عمومی بودن پروفایل
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ ایجاد حساب
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: تاریخ آخرین بروزرسانی
 */

// request update base user
/**
 * @swagger
 * components:
 *     UpdateMobilePhoneRequest:
 *       type: object
 *       required:
 *         - mobile_phone
 *       properties:
 *         mobile_phone:
 *           type: string
 *           description: شماره موبایل جدید
 *           example: "09123456789"
 * 
 *     ConfirmMobilePhoneRequest:
 *       type: object
 *       required:
 *         - mobile_phone
 *         - code
 *       properties:
 *         mobile_phone:
 *           type: string
 *           description: شماره موبایل جدید
 *           example: "09123456789"
 *         code:
 *           type: integer
 *           description: کد OTP دریافتی
 *           example: 123456
 * 
 *     OtpSuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "code send!"
 * 
 *     MobilePhoneSuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         message:
 *           type: string
 *           example: "successfully update mobile_phone"
 */