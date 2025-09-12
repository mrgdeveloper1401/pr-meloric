import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../../../middlewares/authenticate";
import { AppDataSource } from "../../../../data-source";
import { User } from "../../../../entity/User";
import { plainToClass } from "class-transformer";
import { ChangeAndConfirmMobilePhone, UpdateMobilePhoneDto } from "../../../../dtos/auth/UpdateMobilePhone";
import { validate } from "class-validator";
import { sendOtp } from "../../../../utils/sendOtpSmsIr";
import { VerifyOtpRedis } from "../../../../utils/connectRedis";


export const informationUserRouter = Router();

// get base user
/**
 * @swagger
 * /v1/user/information/base_user:
 *   get:
 *     summary: دریافت اطلاعات پایه کاربر
 *     description: دریافت اطلاعات اصلی کاربر احراز هویت شده
 *     tags: [User-Information]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: اطلاعات کاربر با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/BaseUserResponse'
 *       404:
 *         description: کاربر پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
informationUserRouter.get(
    '/base_user/',
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            // get user
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {id: userId, is_active: true},
                    select: {
                        createdAt: true,
                        updatedAt: true,
                        id: true,
                        mobile_phone: true,
                        email: true,
                        username: true,
                        is_artist: true,
                        is_public: true
                    }
                }
            );
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: "false",
                        message: "user not found"
                    }
                )
            }

            return res.status(200).json(
                {
                    status: "success",
                    data: getUser
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            )
        }
    }
);

// update mobile phone user
/**
 * @swagger
 * /v1/user/information/request_update_phone:
 *   post:
 *     summary: درخواست تغییر شماره موبایل
 *     description: ارسال کد OTP برای تغییر شماره موبایل کاربر
 *     tags: [User-Information]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile_phone
 *             properties:
 *               mobile_phone:
 *                 type: string
 *                 description: شماره موبایل جدید
 *                 example: "09123456789"
 *     responses:
 *       201:
 *         description: کد OTP با موفقیت ارسال شد
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
 *                   example: "code send!"
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: شماره موبایل قبلاً استفاده شده است
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
informationUserRouter.post(
    "/request_update_phone/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            // validate
            const updateMobilePhoneDto = plainToClass(UpdateMobilePhoneDto, req.body);
            const errors = await validate(updateMobilePhoneDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: errors
                    }
                );
            }

            // check mobile dose exists
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {mobile_phone: updateMobilePhoneDto.mobile_phone, is_active: true},
                    select: ['id']
                }
            );
            if (getUser) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "this mobile phone already exists"
                    }
                );
            }

            // send code
            await sendOtp(updateMobilePhoneDto.mobile_phone, req)
            return res.status(201).json(
                {
                    status: false,
                    message: "code send!"
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            );
        }
    }
);

// verify otp and change mobile phone
/**
 * @swagger
 * /v1/user/information/confirm_and_change_mobile_phone:
 *   post:
 *     summary: تأیید و تغییر شماره موبایل
 *     description: تأیید کد OTP و تغییر شماره موبایل کاربر
 *     tags: [User-Information]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobile_phone
 *               - code
 *             properties:
 *               mobile_phone:
 *                 type: string
 *                 description: شماره موبایل جدید
 *                 example: "09123456789"
 *               code:
 *                 type: integer
 *                 description: کد OTP دریافتی
 *                 example: 123456
 *     responses:
 *       200:
 *         description: شماره موبایل با موفقیت تغییر کرد
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
 *                   example: "successfully update mobile_phone"
 *       400:
 *         description: داده‌های ورودی نامعتبر
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: کد OTP نامعتبر یا کاربر پیدا نشد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
informationUserRouter.post(
    "/confirm_and_change_mobile_phone/",
    authenticateJWT,
    async(req: Request, res: Response) => {
        try {
            // check req body
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                )
            }

            // validate data
            const verifyOtpPhone = plainToClass(ChangeAndConfirmMobilePhone, req.body)
            const errors = await validate(verifyOtpPhone);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        error: errors.map(
                            err => (
                                {
                                    field: err.property,
                                    value: err.constraints
                                    }
                            )
                        )
                    }
                );
            }

            // check otp code
            const checkOtpCode = await VerifyOtpRedis(verifyOtpPhone.code, req.ip)
            if (checkOtpCode === null) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "code is invalid"
                    }
                );
            }

            // update base user
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {mobile_phone: verifyOtpPhone.mobile_phone, is_active: true},
                    select: ['mobile_phone', 'id']
                }
            )
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                )
            }

            getUser.mobile_phone = verifyOtpPhone.mobile_phone;
            await getUser.save();
            return res.status(200).json(
                {
                    status: "success",
                    message: "successfully update mobile_phone"
                }
            );
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            )
        }
    }
);
