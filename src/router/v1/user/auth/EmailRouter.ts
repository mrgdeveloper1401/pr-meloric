import { plainToClass } from "class-transformer";
import { Router, Request, Response } from "express";
import {
  EmailDto,
  VerifyForgetPasswordEmailDto,
  VerifyOtpEmailDto,
} from "../../../../dtos/auth/EmailDtos";
import { validate } from "class-validator";
import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { emailOtpRateLimit } from "../../../../middlewares/EmailRateLimit";
import {
  funcCreateToken,
  CreateJwtLink,
  decodeJwtToken,
} from "../../../../utils/createJwtToken";
import { createEmailService } from "../../../../utils/EmailService";
import {
  authenticateJWT,
  notAuthenticateJwt,
} from "../../../../middlewares/authenticate";
import { funcCreateHashPassword } from "../../../../utils/createHashPassword";

export const emailRouter = Router();

// request otp
/**
 * @swagger
 * /v1/email/request_otp_email:
 *   post:
 *     tags:
 *       - Authentication
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
      const emailDto = plainToClass(EmailDto, req.body);
      const errors = await validate(emailDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "invalid data",
          errors: errors,
        });
      }

      // check user dose exists
      const userRepository = AppDataSource.getRepository(User);
      const checkUser = await userRepository.findOne({
        where: {
          email: emailDto.email,
          is_active: true,
        },
        select: {
          id: true,
        },
      });
      if (!checkUser) {
        return res.status(404).json({
          status: false,
          message: "user not found",
        });
      }

      // store otp in redis // TODO, use background task
      const otpCode = await createEmailService.storeEmailOtp(
        emailDto.email,
        req.ip,
        "otp"
      );

      // // send otp into email
      await createEmailService.sendEmail({
        to: emailDto.email,
        subject: "کد تأیید ایمیل",
        text: `کد تأیید شما`,
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
                `,
      });
      return res.status(200).json({
        status: "success",
        message: `otp send into email ${emailDto.email}`,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// email login verify otp
/**
 * @swagger
 * /v1/email/verify_otp_email:
 *   post:
 *     tags:
 *       - Authentication
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
 *                 type: number
 *                 description: کد ۶ رقمی ارسال شده به ایمیل
 *                 example: 123456
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
emailRouter.post("/verify_otp_email/", async (req: Request, res: Response) => {
  try {
    const verifyEmailDto = plainToClass(VerifyOtpEmailDto, req.body);
    const errors = await validate(verifyEmailDto);

    if (errors.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid Data",
        errors: errors.map((err) => ({
          property: err.property,
          constraints: err.constraints,
        })),
      });
    }

    // check otp
    const verifyOtpRedis = await createEmailService.verifyEmailOtp(
      verifyEmailDto.email,
      verifyEmailDto.code,
      req.ip,
      "otp"
    );

    if (!verifyOtpRedis) {
      return res.status(404).json({
        status: false,
        message:
          "کد تأیید نامعتبر است یا منقضی شده. لطفاً درخواست کد جدید کنید",
      });
    }

    // 3. check user
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: {
        email: verifyEmailDto.email,
        is_active: true,
      },
      select: {
        id: true,
        is_staff: true,
        is_artist: true,
        email: true,
        // is_verify_email: true
      },
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "کاربر یافت نشد یا حساب غیرفعال است",
      });
    }

    const tokens = funcCreateToken(user.id, true);

    // update is_verify_email
    // if (user.is_verify_email === false){
    //     user.is_verify_email = true;
    //     await user.save()
    // }

    return res.status(200).json({
      status: "success",
      message: "احراز هویت با موفقیت انجام شد",
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      is_staff: user.is_staff,
      is_artist: user.is_artist,
      user_id: user.id,
      token_type: "Bearer",
      expires_in: "30d",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "خطای سرور داخلی",
      error: error.message,
    });
  }
});

// send link into email
/**
 * @swagger
 * /v1/email/send_link_into_email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: ارسال لینک تأیید ایمیل
 *     description: |
 *       ارسال لینک تأیید ایمیل حاوی توکن JWT به آدرس ایمیل کاربر
 *
 *       نکات مهم:
 *       - کاربر باید لاگین باشد و توکن دسترسی معتبر ارائه دهد
 *       - لینک ارسالی حاوی توکن JWT با انقضای ۵ دقیقه است
 *       - ایمیل باید متعلق به کاربر لاگین شده باشد
 *       - پس از کلیک روی لینک، کاربر به صفحه تأیید ایمیل هدایت می‌شود
 *     security:
 *       - bearerAuth: []
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
 *                 description: آدرس ایمیل کاربر برای دریافت لینک تأیید
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: لینک با موفقیت ارسال شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "send link into email user@example.com"
 *       400:
 *         description: خطا در داده‌های ورودی یا عدم وجود body
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: "request body is required"
 *                 - type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "email"
 *                       value:
 *                         type: object
 *                         properties:
 *                           isEmail:
 *                             type: string
 *                             example: "email must be an email"
 *       401:
 *         description: عدم احراز هویت یا توکن نامعتبر
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
 *                   example: "Unauthorized"
 *       404:
 *         description: ایمیل پیدا نشد یا متعلق به کاربر لاگین شده نیست
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
 *                   example: "email not found"
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
 *                   example: "خطای ارسال ایمیل"
 *     x-codeSamples:
 *       - lang: curl
 *         label: cURL
 *         source: |
 *           curl -X POST "http://localhost:8000/v1/email/send_link_into_email" \
 *           -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
 *           -H "Content-Type: application/json" \
 *           -d '{"email": "user@example.com"}'
 */
emailRouter.post(
  "/send_link_into_email",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      // dto
      const emailDto = plainToClass(EmailDto, req.body);
      const errors = await validate(emailDto);
      if (errors.length > 0) {
        return res.status(400).json(
          errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          }))
        );
      }

      // check user email
      const userId = (req as any).user.user_id;
      const userRepository = AppDataSource.getRepository(User);
      const checkUserEmail = await userRepository.findOne({
        where: {
          email: emailDto.email,
          is_active: true,
          id: userId,
        },
        select: { email: true },
      });
      if (!checkUserEmail) {
        return res.status(404).json({
          status: false,
          message: "email not found",
        });
      }

      // send link into emial
      const token = await CreateJwtLink(checkUserEmail.id, req.ip);
      const domainName = process.env.DOMAIN_NAME || `http://localhost:8000`;
      const callBackUrl = `${domainName}/v1/email/verify_email_link/${token}`;
      await createEmailService.sendEmail({
        to: emailDto.email,
        subject: "لینک اعتبار سنجی ایمیل",
        text: "لینک اعتبار سنجی ایمیل",
        html: `
                    <div dir="rtl" style="font-family: Tahoma; padding: 20px;">
                      <h2>لینک تأیید ایمیل</h2>
                      <p>لینک تأیید شما:</p>
                      <div style="background: #f0f0f0; padding: 15px; font-size: 24px;
                                  text-align: center; margin: 20px 0;">
                        <strong>${callBackUrl}</strong>
                      </div>
                      <p>این لینک تا 5 دقیقه معتبر است.</p>
                      <hr>
                    </div>
                  `,
      });

      return res.status(200).json({
        status: "success",
        message: `send link into email ${emailDto.email}`,
        // token: callBackUrl,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// verify email
/**
 * @swagger
 * /v1/email/verify_email_link/{token}:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: تأیید ایمیل از طریق لینک ارسالی
 *     description: |
 *       تأیید اعتبار ایمیل کاربر با استفاده از توکن JWT موجود در لینک ارسال شده به ایمیل
 *
 *       نکات مهم:
 *       - این endpoint از طریق لینک ارسال شده به ایمیل فراخوانی می‌شود
 *       - توکن JWT به مدت ۵ دقیقه معتبر است
 *       - پس از تأیید موفق، وضعیت تأیید ایمیل کاربر به‌روز می‌شود
 *       - توکن فقط یکبار قابل استفاده است (در صورت نیاز به پیاده‌سازی One-Time Use)
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: توکن JWT ارسال شده در لینک تأیید ایمیل
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: ایمیل با موفقیت تأیید شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "ایمیل با موفقیت تأیید شد"
 *       400:
 *         description: توکن نامعتبر یا منقضی شده
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
 *                   example: "Invalid or expired token"
 *                 error:
 *                   type: string
 *                   example: "Token expired"
 *       401:
 *         description: توکن معتبر نیست یا دسترسی غیرمجاز
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
 *                   example: "Invalid or expired token."
 *       404:
 *         description: کاربر یافت نشد
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
 *                   example: "User not found"
 *       409:
 *         description: ایمیل قبلاً تأیید شده است
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
 *                   example: "Email already verified"
 *                 data:
 *                   type: object
 *                   properties:
 *                     verified_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-14T15:20:00Z"
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
  "/verify_email_link/:Token",
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const { Token } = req.params;
      const emailDto = plainToClass(EmailDto, req.body);
      const errors = await validate(emailDto);
      if (errors.length > 0) {
        return res.status(400).json(
          errors.map((err) => ({
            field: err.property,
            value: err.constraints,
          }))
        );
      }

      // check token dose exists
      if (!Token || Token.trim() === "") {
        return res.status(400).json({
          status: false,
          message: "Token is required",
        });
      }

      // decode jwt
      const decoded = await decodeJwtToken(Token, req.ip);
      if (decoded.success === false) {
        return res.status(400).json({
          status: false,
          message: decoded.error || null,
          error: decoded.message || null,
        });
      }

      const userId = (req as any).user.user_id;

      // find user
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: {
          id: userId,
          is_active: true,
          //   is_verify_email: true
        },
        select: {
          id: true,
          email: true,
          // is_verify_email: true
        },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
        });
      }

      // check email
      // user.is_verify_email = true;
      user.email = emailDto.email;
      await user.save();
      //   await userRepository.save(user);

      return res.status(200).json({
        status: "success",
        message: "ایمیل با موفقیت بروزرسانی شد",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// send otp forget_password into email
/**
 * @swagger
 * /v1/email/request_email_forget_password/:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: درخواست ارسال لینک/کد بازیابی رمز عبور
 *     description: |
 *       ارسال کد بازیابی رمز عبور (OTP) به ایمیل کاربر برای بازنشانی رمز عبور
 *
 *       نکات مهم:
 *       - این endpoint برای کاربران غیرلاگین‌شده قابل دسترسی است
 *       - کد OTP به مدت ۲ دقیقه معتبر است
 *       - برای حفظ حریم خصوصی، حتی اگر ایمیل وجود نداشته باشد نیز پاسخ موفق نشان داده می‌شود
 *       - کد OTP در Redis ذخیره می‌شود و با IP کاربر مرتبط می‌شود
 *     security:
 *       - JWT: []
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
 *                 description: آدرس ایمیل کاربر برای بازیابی رمز عبور
 *                 example: "user@example.com"
 *           examples:
 *             validRequest:
 *               summary: نمونه درخواست معتبر
 *               value:
 *                 email: "user@example.com"
 *     responses:
 *       201:
 *         description: |
 *           درخواست ارسال کد OTP با موفقیت دریافت شد
 *
 *           نکته: برای حفظ امنیت، حتی اگر ایمیل در سیستم وجود نداشته باشد نیز این پاسخ ارسال می‌شود
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "otp send successfully"
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "email"
 *                       value:
 *                         type: object
 *                         example:
 *                           isEmail: "email must be an email"
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
  "/request_email_forget_password/",
  notAuthenticateJwt,
  async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({
          status: false,
          message: "request body is required",
        });
      }

      const requestEmailDto = plainToClass(EmailDto, req.body);
      const error = await validate(requestEmailDto);
      if (error.length > 0) {
        return res.status(400).json(
          error.map((err) => ({
            field: err.property,
            value: err.constraints,
          }))
        );
      }

      // check email
      const userRepository = AppDataSource.getRepository(User);
      const checkUserEmail = await userRepository.findOne({
        where: {
          is_active: true,
          email: requestEmailDto.email,
        },
        select: {
          id: true,
        },
      });
      if (!checkUserEmail) {
        return res.status(200).json({
          status: "success",
          message: "otp send successfly",
        });
      }
      // store in redis
      const otpCode = await createEmailService.storeEmailOtp(
        requestEmailDto.email,
        req.ip,
        "forget_password"
      );

      // send otp into email
      await createEmailService.sendEmail({
        to: requestEmailDto.email,
        subject: "بازنشانی رمز عبور",
        text: `کد بازیابی رمز عبور شما:  ${otpCode}`,
        html: `
                <div dir="rtl" style="font-family: Tahoma, sans-serif; padding: 20px; direction: rtl; text-align: right;">
                <h2 style="color: #333;">بازنشانی رمز عبور</h2>
                <p>کاربر گرامی، درخواست بازنشانی رمز عبور برای حساب کاربری شما دریافت شد. برای تغییر رمز عبور، کد زیر را وارد کنید:</p>
                
                <div style="background: #f0f0f0; padding: 15px; font-size: 24px; letter-spacing: 5px;
                            text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #ddd;">
                    <strong>${otpCode}</strong>
                </div>
                
                <p style="font-size: 14px; color: #666;">این کد تا ۲ دقیقه معتبر است.</p>
                <p style="font-size: 14px; color: #999;">اگر شما درخواستی ارسال نکرده‌اید، لطفاً این پیام را نادیده بگیرید.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;">
                </div>
            `,
      });

      return res.status(200).json({
        status: "success",
        message: "otp send successfly",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);

// verify link forget_password into email
/**
 * @swagger
 * /v1/email/verify_email_forget_password/:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: تأیید کد بازیابی رمز عبور و تنظیم رمز عبور جدید
 *     description: |
 *       تأیید کد OTP ارسال شده به ایمیل و تنظیم رمز عبور جدید برای کاربر
 *
 *       نکات مهم:
 *       - این endpoint برای کاربران غیرلاگین‌شده قابل دسترسی است
 *       - کد OTP باید طی ۲ دقیقه تأیید شود
 *       - رمز عبور جدید و تأیید رمز عبور باید یکسان باشند
 *       - پس از تأیید موفق، رمز عبور کاربر به‌روزرسانی شده و توکن‌های دسترسی صادر می‌شوند
 *       - کد OTP پس از تأیید موفق، از Redis حذف می‌شود (One-Time Use)
 *     security:
 *       - JWT: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - new_password
 *               - confirm_new_password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: آدرس ایمیل کاربر
 *                 example: "user@example.com"
 *               code:
 *                 type: integer
 *                 description: کد تأیید ارسال شده به ایمیل (به صورت عددی)
 *                 example: 123456
 *               new_password:
 *                 type: string
 *                 description: رمز عبور جدید
 *                 minLength: 6
 *                 example: "newPassword123!"
 *                 format: password
 *               confirm_new_password:
 *                 type: string
 *                 description: تأیید رمز عبور جدید (باید با new_password یکسان باشد)
 *                 minLength: 6
 *                 example: "newPassword123!"
 *                 format: password
 *           examples:
 *             validRequest:
 *               summary: نمونه درخواست معتبر
 *               value:
 *                 email: "user@example.com"
 *                 code: 123456
 *                 new_password: "newPassword123!"
 *                 confirm_new_password: "newPassword123!"
 *             passwordMismatch:
 *               summary: نمونه با رمزهای عبور ناهمخوان
 *               value:
 *                 email: "user@example.com"
 *                 code: 123456
 *                 new_password: "password123"
 *                 confirm_new_password: "differentPassword"
 *     responses:
 *       200:
 *         description: |
 *           کد با موفقیت تأیید شد، رمز عبور به‌روزرسانی شد و توکن‌های دسترسی صادر شدند
 *
 *           کاربر می‌تواند بلافاصله با رمز عبور جدید و توکن دریافتی وارد سیستم شود
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "رمز عبور با موفقیت تغییر یافت و احراز هویت انجام شد"
 *                 access_token:
 *                   type: string
 *                   description: توکن دسترسی (معتبر به مدت ۳۰ روز)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن تازه‌سازی برای دریافت توکن دسترسی جدید
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 is_staff:
 *                   type: boolean
 *                   description: آیا کاربر مدیر است؟
 *                   example: false
 *                 is_artist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *                 user_id:
 *                   type: string
 *                   description: شناسه یکتا کاربر
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 token_type:
 *                   type: string
 *                   example: "Bearer"
 *                 expires_in:
 *                   type: string
 *                   description: مدت زمان اعتبار توکن دسترسی
 *                   example: "30d"
 *       400:
 *         description: |
 *           داده‌های ورودی نامعتبر
 *
 *           دلایل احتمالی:
 *           - فیلدهای الزامی پر نشده‌اند
 *           - فرمت ایمیل نامعتبر است
 *           - کد OTP باید عددی باشد
 *           - رمز عبور جدید و تأیید آن یکسان نیستند (نیاز به پیاده‌سازی custom validator)
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
 *                   example: "Invalid Data"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       property:
 *                         type: string
 *                         example: "confirm_new_password"
 *                       constraints:
 *                         type: object
 *                         example:
 *                           match: "confirm_new_password must match new_password"
 *       404:
 *         description: |
 *           کد تأیید نامعتبر است یا کاربر یافت نشد
 *
 *           دلایل احتمالی:
 *           - کد OTP منقضی شده (بیش از ۲ دقیقه از ارسال گذشته)
 *           - کد OTP اشتباه وارد شده
 *           - درخواست از IP متفاوتی ارسال شده
 *           - ایمیل در سیستم وجود ندارد
 *           - حساب کاربری غیرفعال است
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: "کد تأیید نامعتبر است یا منقضی شده. لطفاً درخواست کد جدید کنید"
 *                 - type: object
 *                   properties:
 *                     status:
 *                       type: boolean
 *                       example: false
 *                     message:
 *                       type: string
 *                       example: "کاربر یافت نشد یا حساب غیرفعال است"
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
  "/verify_email_forget_password/",
  notAuthenticateJwt,
  async (req: Request, res: Response) => {
    try {
      const verifyEmailDto = plainToClass(
        VerifyForgetPasswordEmailDto,
        req.body
      );
      const errors = await validate(verifyEmailDto);
      if (errors.length > 0) {
        return res.status(400).json({
          status: false,
          message: "Invalid Data",
          errors: errors.map((err) => ({
            property: err.property,
            constraints: err.constraints,
          })),
        });
      }

      //   check otp
      const verifyOtpRedis = await createEmailService.verifyEmailOtp(
        verifyEmailDto.email,
        verifyEmailDto.code,
        req.ip,
        "forget_password"
      );
      if (!verifyOtpRedis) {
        return res.status(404).json({
          status: false,
          message:
            "کد تأیید نامعتبر است یا منقضی شده. لطفاً درخواست کد جدید کنید",
        });
      }

      // 3. check user
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: {
          email: verifyEmailDto.email,
          is_active: true,
        },
        select: {
          id: true,
          is_staff: true,
          is_artist: true,
          email: true,
          password: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "کاربر یافت نشد یا حساب غیرفعال است",
        });
      }

      //   token
      const tokens = funcCreateToken(user.id, true);

      //   check password
      if (verifyEmailDto.confirm_new_password !== verifyEmailDto.new_password) {
        return res.status(400).json({
          status: false,
          message: "password not same",
        });
      }

      // save new password
      const hashPassword = funcCreateHashPassword(verifyEmailDto.new_password);
      user.password = hashPassword;
      await user.save();

      //   response data
      return res.status(200).json({
        status: "success",
        message: "احراز هویت با موفقیت انجام شد",
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        is_staff: user.is_staff,
        is_artist: user.is_artist,
        user_id: user.id,
        token_type: "Bearer",
        expires_in: "30d",
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "server error",
        error: error.message,
      });
    }
  }
);
