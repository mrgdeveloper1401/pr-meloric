import { plainToClass } from "class-transformer";
import { Router, Request, Response } from "express";
import { EmailDto } from "../../../../dtos/auth/EmailDtos";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { emailOtpRateLimit } from "../../../../middlewares/EmailRateLimit";


export const emailRouter = Router();


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
            // await createEmailService.storeEmailOtp(emailDto.email, req.ip);
            // // send otp into email
            // await createEmailService.sendEmail(
            //     {
            //         to: emailDto.email,
            //         subject: "ارسال کد تایید ایمیل",
            //         html: "salam donya",
            //         text: "ارسال کد تایید ایمیل"
            //     }
            // );
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


// emailRouter.post(
//     "/verify_otp_email"
// )


// emailRouter.post(
//     "/request_forget_password_email`"
// )


// emailRouter.post(
//     "/verify_forget_password_email"
// )