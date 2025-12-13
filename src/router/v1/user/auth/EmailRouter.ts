import { plainToClass } from "class-transformer";
import { Router, Request, Response } from "express";
import { EmailDto, VerifyOtpEmailDto } from "../../../../dtos/auth/EmailDtos";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { emailOtpRateLimit } from "../../../../middlewares/EmailRateLimit";
import { funcCreateToken } from "../../../../utils/createJwtToken";
import { createEmailService } from "../../../../utils/EmailService";


export const emailRouter = Router();


// request otp
/**
 * @swagger
 * /v1/email/request_otp_email:
 *   post:
 *     tags:
 *       - Email
 *     summary: درخواست کد تأیید ایمیل
 *     description: |
 *       ارسال کد تأیید ۶ رقمی به ایمیل کاربر برای تأیید ایمیل
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: کد تأیید با موفقیت ارسال شد
 *       400:
 *         description: خطا در پارامترهای ورودی
 *       429:
 *         description: تعداد درخواست‌ها بیش از حد مجاز
 *       500:
 *         description: خطای سرور
 */
emailRouter.post(
    "/request_otp_email",
    emailOtpRateLimit,
    async (req: Request, res: Response) => {
        try {
            const emailDto = plainToClass(EmailDto, req.body)
            const errors = await validate(emailDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "invalid data",
                        errors: errors
                    }
                )
            }

            // check user dose exists
            const userRepository = AppDataSource.getRepository(User);
            const checkUser = await userRepository.findOne(
                {
                    where: {
                        email: emailDto.email,
                        is_active: true
                    },
                    select: {
                        id: true
                    }
                }
            );
            if (!checkUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                )
            }

            // store otp in redis
            const otpCode = await createEmailService.storeEmailOtp(emailDto.email, req.ip);

            // // send otp into email
            await createEmailService.sendEmail({
                to: emailDto.email, // یا "test@example.com" برای تست
                subject: "کد تأیید ایمیل",
                text: `کد تأیید شما`, // اینجا می‌توانید کد واقعی بگذارید
                html: `
                  <div dir="rtl" style="font-family: Tahoma; padding: 20px;">
                    <h2>کد تأیید ایمیل</h2>
                    <p>کد تأیید شما:</p>
                    <div style="background: #f0f0f0; padding: 15px; font-size: 24px; 
                                text-align: center; margin: 20px 0;">
                      <strong>${otpCode}</strong>
                    </div>
                    <p>این کد تا 2 دقیقه معتبر است.</p>
                    <hr>
                  </div>
                `
              });
            return res.status(200).json(
                {
                    status: "success",
                    message: `otp send into email ${emailDto.email}`
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error",
                    error: error.message
                }
            )
        }
    }
);


// email login verify otp
/**
 * @swagger
 * /v1/email/verify_otp_email:
 *   post:
 *     tags:
 *       - Email
 *     summary: تأیید کد OTP ایمیل
 *     description: |
 *       تأیید کد ۶ رقمی ارسال شده به ایمیل و ایجاد توکن دسترسی در صورت موفقیت
 *       
 *       نکات مهم:
 *       - کد OTP فقط یکبار قابل استفاده است
 *       - کد OTP به مدت ۵ دقیقه معتبر است
 *       - پس از تأیید موفق، توکن دسترسی و توکن تازه‌سازی صادر می‌شود
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: ایمیل کاربر
 *                 example: "user@example.com"
 *               code:
 *                 type: string
 *                 description: کد ۶ رقمی ارسال شده به ایمیل
 *                 example: "123456"
 *                 minLength: 6
 *                 maxLength: 6
 *     responses:
 *       200:
 *         description: تأیید موفق و توکن‌ها ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 access_token:
 *                   type: string
 *                   description: توکن دسترسی برای احراز هویت
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن تازه‌سازی برای دریافت توکن دسترسی جدید
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 is_staff:
 *                   type: boolean
 *                   description: آیا کاربر مدیر سیستم است؟
 *                   example: false
 *                 is_artist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *       400:
 *         description: داده‌های ورودی نامعتبر
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
 *                   example: "invalid data"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: کاربر یافت نشد یا کد OTP نامعتبر است
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
 *                   example: "email or otp code is invalid"
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
 *                 error:
 *                   type: string
 *                   example: "خطای داخلی سرور"
 */
emailRouter.post(
    "/verify_otp_email",
    async (req: Request, res: Response) => {
        try {
            const verifyEmailDto = plainToClass(VerifyOtpEmailDto, req.body);
            const errors = await validate(verifyEmailDto);
            
            if (errors.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "داده‌های ورودی نامعتبر است",
                    errors: errors.map(err => ({
                        property: err.property,
                        constraints: err.constraints,
                        value: err.value
                    }))
                });
            }

            // 2. بررسی صحت کد OTP
            const verifyOtpRedis = await createEmailService.verifyEmailOtp(
                verifyEmailDto.email, 
                verifyEmailDto.code, 
                req.ip
            );
            
            if (!verifyOtpRedis) {
                return res.status(404).json({
                    status: false,
                    message: "کد تأیید نامعتبر است یا منقضی شده. لطفاً درخواست کد جدید کنید"
                });
            }

            // 3. بررسی وجود کاربر فعال
            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne({
                where: {
                    email: verifyEmailDto.email,
                    is_active: true
                },
                select: {
                    id: true,
                    is_staff: true,
                    is_artist: true,
                    email: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: "کاربر یافت نشد یا حساب غیرفعال است"
                });
            }

            const tokens = funcCreateToken(user.id, true);
            
            return res.status(200).json({
                status: "success",
                message: "احراز هویت با موفقیت انجام شد",
                access_token: tokens.accessToken,
                refresh_token: tokens.refreshToken,
                is_staff: user.is_staff,
                is_artist: user.is_artist,
                user_id: user.id,
                token_type: "Bearer",
                expires_in: "30d"
            });

        } catch (error) {            
            return res.status(500).json({
                status: false,
                message: "خطای سرور داخلی",
                error: error.message
            });
        }
    }
);

// emailRouter.post(
//     "/request_forget_password_email`"
// )


// emailRouter.post(
//     "/verify_forget_password_email"
// )