import express from "express";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { User } from "../../../../entity/User";
import { AppDataSource } from "../../../../data-source";
import { funcCreateHashPassword } from "../../../../utils/createHashPassword";
import { funcCreateToken } from "../../../../utils/createJwtToken";
import { authenticateJWT, notAuthenticateJwt } from "../../../../middlewares/authenticate";
import { sendOtp } from "../../../../utils/sendOtpSmsIr";
import { VerifyOtpRedis } from "../../../../utils/connectRedis";
import { validate } from "class-validator";
import { Profile } from "../../../../entity/Profile";
import { funcCheckUserActive } from "../../../../middlewares/checkUserActive";
import { ResetPasswordDto } from "../../../../dtos/auth/ResetPassword.dto";
import { plainToClass } from "class-transformer";
import { SignUpUserDto } from "../../../../dtos/auth/SignupUser";
import { refreshTokenDto } from "../../../../dtos/auth/RefreshToken";
import { TokenBlockDto } from "../../../../dtos/auth/TokenBlock";
import { TokenBlock } from "../../../../entity/TokenBlock";
import { LoginUsernameDto } from "../../../../dtos/auth/LoginUsername";
import { LoginByEmailDto } from "../../../../dtos/auth/LoginInByEmail";
import { RequestOtpPhoneDto } from "../../../../dtos/auth/RequestOtpPhone";
import { VerifyOtpPhoneDto } from "../../../../dtos/auth/VerifyOtpPhone";
import { UserNotification } from "../../../../entity/UserNotification";
import { confirmForgetPasswordDto } from "../../../../dtos/auth/ConfirmForgetPassword";
import { requestEmailDto } from "../../../../dtos/auth/RequestEmail";
import { ProfileDto } from "../../../../dtos/auth/ProfileDto";
import { Image } from "../../../../entity/Image";
// import { checkImageOwnership } from "../../../../middlewares/CheckOwnerImage";

const userAuthRouter = express.Router()

// refresh router
/**
 * @swagger
 * /v1/auth/user/refresh_token:
 *   post:
 *     summary: Create new access token using refresh token
 *     description: |
 *       Generate a new access token by providing a valid refresh token.
 *       The refresh token must not be blocked and must be of type 'refresh'.
 *     tags:
 *       - jwt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenDto'
 *           example:
 *             refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       201:
 *         description: New access token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *             example:
 *               status: "success"
 *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Bad request - Invalid data or token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidData:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   errors:
 *                     - field: "refresh_token"
 *                       value: { isString: "refresh_token must be a string" }
 *               invalidTokenType:
 *                 value:
 *                   status: false
 *                   message: "Invalid token type"
 *               tokenBlocked:
 *                 value:
 *                   status: false
 *                   message: "this refresh_token blocked"
 *       403:
 *         description: Forbidden - Account is banned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: false
 *               message: "your account is ben!"
 *       404:
 *         description: Not found - User not found or secret key missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               userNotFound:
 *                 value:
 *                   status: false
 *                   message: "user not found"
 *               secretKeyMissing:
 *                 value:
 *                   status: false
 *                   message: "JWT_SECRET_KEY is not found in .env file"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/refresh_token",
    async (req: Request, res: Response) => {
        try {
            // check request body
            if (!req.body) {
                return res.status(400).json(
                    {
                        success: false,
                        message: "request body is required"
                    }
                );
            }

            // validate data dto
            const refreshToken = plainToClass(refreshTokenDto, req.body);
            const error = await validate(refreshToken);
            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        errors: error.map(
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

            // check and validate refresh token
            const refreshSecretKey = process.env.REFRESH_JWT_SECRET_KEY
            if (!refreshSecretKey) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "REFRESH_JWT_SECRET_KEY is not defined in .env file"
                    }
                );
            }

            // decode refresh token
            try {
                const decodeRefreshToken = jwt.verify(refreshToken.refresh_token, refreshSecretKey)
                if (decodeRefreshToken['type_token'] !== "refresh") {
                    return res.status(400).json(
                        {
                           status: false,
                           message: "Invalid token type"
                        }
                    )
                }

                // is token block?
                const tokenRepository = AppDataSource.getRepository(TokenBlock);
                const isTokenBlock = await tokenRepository.findOne(
                    {
                        where: {token_uuid: decodeRefreshToken['uuid_name']},
                        select: ['token_uuid']
                    }
                );
                if (isTokenBlock !== null) {
                    return res.status(400).json(
                        {
                            status: false,
                            message: "this refresh_token blocked"
                        }
                    );
                }

                // check user
                const userRepository = AppDataSource.getRepository(User);
                const user = await userRepository.findOne(
                {
                    where: {id: decodeRefreshToken['user_id']},
                    select: ['id', "is_active"]
                }
            );
            if (!user) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                );
            }
            if (!user.is_active) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "your account is ben!"
                    }
                );
            }

            // create access_token
            const accessSecretKey = process.env.JWT_SECRET_KEY
            if (!accessSecretKey) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "JWT_SECRET_KEY is not found in .env file"
                    }
                );
            }
            const token = jwt.sign(
                {user_id: decodeRefreshToken['user_id'], type_token: "access", is_active: user.is_active},
                accessSecretKey,
                {expiresIn: "1h"}
            )
            return res.status(201).json(
                {
                    status: "success",
                    token: token
                }
            )
            } catch (error) {
                return res.status(400).json(
                    {
                        status: false,
                        message: error
                    }
                );
            }
    } catch (error) {
        return res.status(500).json(
            {
                status: false,
                message: "server error"
            }
        )
    }
})

// token block
/**
 * @swagger
 * /v1/auth/user/token_block:
 *   post:
 *     summary: block refresh_token
 *     description: for block refresh_token use this endpoint
 *     tags:
 *       - jwt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenBlockDto'
 *           example:
 *             refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       201:
 *         description: توکن با موفقیت بلاک شد
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
 *                   example: "block token successfully"
 *       400:
 *         description: خطای درخواست
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   status: false
 *                   message: "request body is required"
 *               invalidData:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   errors:
 *                     - field: "refresh_token"
 *                       value: { isString: "refresh_token must be a string" }
 *               invalidTokenType:
 *                 value:
 *                   status: false
 *                   message: "Invalid Token Type!"
 *               tokenExists:
 *                 value:
 *                   status: false
 *                   message: "token already exists"
 *       404:
 *         description: کلید احراز هویت یافت نشد
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
 *             example:
 *               status: false
 *               message: "REFRESH_JWT_SECRET_KEY is not found in .env file"
 *       500:
 *         description: خطای سرور
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/token_block/",
    async (req: Request, res: Response) => {
        try {
            // validate data
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            const tokenBlock = plainToClass(TokenBlockDto, req.body)
            const error = await validate(tokenBlock)
            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        errors: error.map(
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

            // check refresh token
            try {
                const refreshSecretKey = process.env.REFRESH_JWT_SECRET_KEY
                if (!refreshSecretKey) {
                    return res.status(404).json(
                        {
                            status: false,
                            message: "REFRESH_JWT_SECRET_KEY is not found in .env file"
                        }
                    );
                }
    
                const verifyRefreshToken = jwt.verify(tokenBlock.refresh_token, refreshSecretKey)
                if (verifyRefreshToken["type_token"] !== "refresh") {
                    return res.status(400).json(
                        {
                            status: false,
                            message: "Invalid Token Type!"
                        }
                    );
                }

                // check token exits
                const tokenRepository = AppDataSource.getRepository(TokenBlock);
                const checkTokenExists = await tokenRepository.findOne(
                    {
                        where: {token_uuid: verifyRefreshToken['uuid_name']},
                        select: ['token_uuid']
                    }
                )
                if (checkTokenExists) {
                    return res.status(400).json(
                        {
                            status: false,
                            message: "token already exists"
                        }
                    );
                }
                
                // save token in database
                const getUserByToken = verifyRefreshToken['user_id'];
                const createTokenBlock = new TokenBlock();
                createTokenBlock.user_id = getUserByToken;
                createTokenBlock.refresh_token = tokenBlock.refresh_token;
                createTokenBlock.token_uuid = verifyRefreshToken['uuid_name']
                await createTokenBlock.save();

                return res.status(201).json(
                    {
                        status: "success",
                        message: "block token successfully"
                    }
                );

            } catch (error) {
                return res.status(400).json(
                    {
                        status: false,
                        message: error
                    }
                );
            }
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

// create user
/**
 * @swagger
 * /v1/auth/user/signup:
 *   post:
 *     summary: ثبت‌نام کاربر جدید
 *     description: |
 *       این endpoint برای ایجاد حساب کاربری جدید استفاده می‌شود.
 *       نام کاربری و ایمیل باید منحصر به فرد باشند.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpUserDto'
 *           example:
 *             email: "user@example.com"
 *             password: "Password123!"
 *             username: "john_doe"
 *             is_artist: true
 *     responses:
 *       201:
 *         description: کاربر با موفقیت ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 accessToken:
 *                   type: string
 *                   description: توکن دسترسی
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   description: توکن رفرش
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 isAdmin:
 *                   type: boolean
 *                   description: آیا کاربر ادمین است؟
 *                   example: false
 *                 isArtist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *       400:
 *         description: خطای اعتبارسنجی یا داده تکراری
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       constraints:
 *                         type: object
 *             examples:
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Validation Field"
 *                   errors:
 *                     - field: "email"
 *                       constraints: { isEmail: "email must be an email" }
 *               usernameExists:
 *                 value:
 *                   message: "username already exists"
 *               emailExists:
 *                 value:
 *                   message: "email is already exists"
 *       500:
 *         description: خطای سرور
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/signup/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        try {

            // check request body
            if (!req.body) {
                return res.status(400).json({message: "request body is required"})
            }

            // validate data
            const signupUserDto = plainToClass(SignUpUserDto, req.body)
            const error = await validate(signupUserDto)
            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Validation Field",
                        errors: error.map(
                            err => (
                                {
                                    field: err.property,
                                    constraints: err.constraints
                                }
                            )
                        )
                    }
                );
            }

            const user = AppDataSource.getRepository(User)

            // check user exits
            const checkUsername = await user.findOne(
                {
                    where: {username: signupUserDto.username},
                    select: ['username', 'is_active', "password", "is_staff", "is_artist"]
                }
            );
            if (checkUsername) {
                return res.status(400).json({message: "username already exists"})
            }
                    const checkEmail = await user.findOne(
                {
                    where: {email: signupUserDto.email}
                }
            )
            if (checkEmail) {
                return res.status(400).json({message: "email is already exists"})
            }

            // create user
            const hashPassword = funcCreateHashPassword(signupUserDto.password);
            const createUser = new User();
            createUser.username = signupUserDto.username;
            createUser.email = signupUserDto.email;
            createUser.is_artist = signupUserDto.is_artist;
            createUser.password = hashPassword;
            await createUser.save()

            // create and return token
            const token  = funcCreateToken(createUser.id, createUser.is_active)
            return res.status(201).json(
                {
                    "status": "success",
                    accessToken: token.accessToken,
                    refreshToken: token.refreshToken,
                    isAdmin: createUser.is_staff,
                    isArtist: createUser.is_artist
                }
            )
        }catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error"
                }
            )
        }

    }
);

// login_by_username
/**
 * @swagger
 * /v1/auth/user/login_by_username:
 *   post:
 *     summary: ورود به سیستم با نام کاربری
 *     description: |
 *       این endpoint برای ورود کاربر به سیستم با استفاده از نام کاربری و رمز عبور استفاده می‌شود.
 *       در صورت موفقیت، توکن دسترسی و توکن رفرش بازگردانده می‌شود.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUsernameDto'
 *           example:
 *             username: "john_doe"
 *             password: "Password123!"
 *     responses:
 *       200:
 *         description: ورود موفقیت‌آمیز
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
 *                   description: توکن دسترسی (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن رفرش (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 is_staff:
 *                   type: boolean
 *                   description: آیا کاربر مدیر است؟
 *                   example: false
 *                 isArtist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *       400:
 *         description: خطای درخواست
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body is required"
 *               invalidData:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   errors:
 *                     - field: "username"
 *                       value: { isString: "username must be a string" }
 *               invalidCredentials:
 *                 value:
 *                   message: "username or password is invalid"
 *               accountBanned:
 *                 value:
 *                   message: "your account is bend!"
 *                   status: false
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                 error:
 *                   type: object
 *             example:
 *               message: "server error"
 *               status: "false"
 *               error: {}
 */
userAuthRouter.post(
    "/login_by_username/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        try {
            // request body
            if (!req.body) {
                return res.status(400).json({message: "request body is required"})
            }

            // validate data
            const loginByUsername = plainToClass(LoginUsernameDto, req.body)
            const error = await validate(loginByUsername);
            
            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        errors: error.map(
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

            const userRepository = AppDataSource.getRepository(User);
            const user = await userRepository.findOne(
                { 
                    where: {username: loginByUsername.username}, select: ["id", 'username', "password", "is_active", "is_staff", "is_artist"]}
                ) ;
            const hashPassword = funcCreateHashPassword(loginByUsername.password);
            const isMatch = user.password === hashPassword

            if (!user) {
                return res.status(400).json({message: "username or password is invalid"})
            }

            if (isMatch === false) {
                return res.status(400).json({message: "username or password is invalid"})
            }
            // check user is_active
            if (!user.is_active) {
                return res.status(400).json(
                    {
                        message: "your account is bend!",
                        status: false
                    }
                )
            }
            // create token
            const token = funcCreateToken(user.id, user.is_active)

            // return token
            return res.status(200).json(
                {
                    "status": "success",
                    access_token: token['accessToken'],
                    refresh_token: token['refreshToken'],
                    is_staff: user.is_staff,
                    isArtist: user.is_artist
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    message: "server error", 
                    status: "false",
                    error: error
                }
            )
        }

    }
);

// login_by_email
/**
 * @swagger
 * /v1/auth/user/login_by_email:
 *   post:
 *     summary: ورود به سیستم با ایمیل
 *     description: |
 *       این endpoint برای ورود کاربر به سیستم با استفاده از ایمیل و رمز عبور استفاده می‌شود.
 *       در صورت موفقیت، توکن دسترسی و توکن رفرش بازگردانده می‌شود.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginByEmailDto'
 *           example:
 *             email: "user@example.com"
 *             password: "Password123!"
 *     responses:
 *       200:
 *         description: ورود موفقیت‌آمیز
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 access_token:
 *                   type: string
 *                   description: توکن دسترسی (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن رفرش (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 isAdmin:
 *                   type: boolean
 *                   description: آیا کاربر مدیر است؟
 *                   example: false
 *                 isArtist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *       400:
 *         description: خطای درخواست - ایمیل یا رمز عبور نامعتبر
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
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body is required"
 *               invalidCredentials:
 *                 value:
 *                   status: false
 *                   message: "invalid email or password"
 *       403:
 *         description: حساب کاربری مسدود شده است
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
 *             example:
 *               status: false
 *               message: "your account is ben!"
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
 *             example:
 *               status: false
 *               message: "invalid email or password"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/login_by_email/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        try {
            // request body
            if (!req.body) {
                return res.status(400).json({message: "request body is required"})
            }

            // validate data
            const loginByEmail = plainToClass(LoginByEmailDto, req.body)

            const userRepository = AppDataSource.getRepository(User);
  
            // get user
            const getUser = await userRepository.findOne(
                {
                    where: {email: loginByEmail.email},
                    select: ["id", 'email', "is_active", "password", 'is_staff', "is_artist"]
                }
            );

            // check user
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "invalid email or password"
                    }
                );
            }

            // compare password
            const isValidPassword = funcCreateHashPassword(loginByEmail.password)
            if (isValidPassword !== getUser.password) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "invalid email or password",
                    }
                );
            }

            // check user is_active
            if (!getUser.is_active) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "your account is ben!"
                    }
                )
            }

            // generate and return token
            const token = funcCreateToken(getUser.id, getUser.is_active);
            return res.status(200).json({
                status: true,
                access_token: token["accessToken"],
                refresh_token: token['refreshToken'],
                isAdmin: getUser.is_staff,
                isArtist: getUser.is_artist
            });

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

// request_otp_phone
/**
 * @swagger
 * /v1/auth/user/request_otp_phone:
 *   post:
 *     summary: درخواست کد OTP برای تلفن همراه
 *     description: |
 *       این endpoint برای ارسال کد تأیید (OTP) به شماره تلفن همراه کاربر استفاده می‌شود.
 *       کاربر باید وجود داشته باشد و حسابش فعال باشد.
 *     tags:
 *       - Authentication
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestOtpPhoneDto'
 *           example:
 *             mobile_phone: "09123456789"
 *     responses:
 *       200:
 *         description: کد OTP با موفقیت ارسال شد
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
 *                   example: "code send!"
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body is required"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   errors:
 *                     - field: "mobile_phone"
 *                       value: { isString: "mobile_phone must be a string" }
 *       403:
 *         description: حساب کاربری مسدود شده است
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "your account is ben!!"
 *       404:
 *         description: کاربر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "user not found!"
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: object
 *             example:
 *               message: "server error"
 *               error: {}
 */
userAuthRouter.post(
    "/request_otp_phone/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        try {
            // check request body
            if (!req.body) {
                return res.status(400).json({message: "request body is required"})
            }

            // validate data
            const requestOtpPhone = plainToClass(RequestOtpPhoneDto, req.body)
            const error = await validate(requestOtpPhone)
            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        errors: error.map(
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

            // check user dose exits
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {mobile_phone: requestOtpPhone.mobile_phone},
                    select: ['mobile_phone', "id", "is_active"]
                }
            )
            if (!getUser) {
                return res.status(404).json({message: "user not found!"})
            }
            if (!getUser.is_active) {
                return res.status(403).json({message: "your account is ben!!"})
            }

            // generate otp code and send otp code
            await sendOtp(requestOtpPhone.mobile_phone, req)
            return res.status(200).json(
                {
                    status: "success",
                    message: "code send!"
                }
            );
        } catch (error) {
            return res.status(500).json({message: "server error", error})
        }

    }
);

// verify_otp_phone
/**
 * @swagger
 * /v1/auth/user/verify_otp_phone:
 *   post:
 *     summary: تأیید کد OTP تلفن همراه
 *     description: |
 *       این endpoint برای تأیید کد OTP ارسال شده به تلفن همراه کاربر استفاده می‌شود.
 *       در صورت موفقیت، توکن دسترسی و توکن رفرش بازگردانده می‌شود.
 *     tags:
 *       - Authentication
 *       - OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpPhoneDto'
 *           example:
 *             mobile_phone: "09123456789"
 *             code: 123456
 *     responses:
 *       200:
 *         description: تأیید موفقیت‌آمیز و بازگشت توکن‌ها
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
 *                   description: توکن دسترسی (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن رفرش (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 isAdmin:
 *                   type: boolean
 *                   description: آیا کاربر مدیر است؟
 *                   example: false
 *                 isArtist:
 *                   type: boolean
 *                   description: آیا کاربر هنرمند است؟
 *                   example: true
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body must be set"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   error:
 *                     - field: "mobile_phone"
 *                       value: { isString: "mobile_phone must be a string" }
 *                     - field: "code"
 *                       value: { isNumber: "code must be a number" }
 *       403:
 *         description: حساب کاربری مسدود شده است
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
 *             example:
 *               status: false
 *               message: "your account is ben!"
 *       404:
 *         description: کد OTP نامعتبر یا کاربر یافت نشد
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
 *             examples:
 *               invalidOtp:
 *                 value:
 *                   status: false
 *                   message: "code is invalid"
 *               userNotFound:
 *                 value:
 *                   status: false
 *                   message: "user not found"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/verify_otp_phone/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        try {
            // check data in body
            if (!req.body) {
                return res.status(400).json({message: "request body must be set"});
            }

            // validate data
            const verifyOtpPhone = plainToClass(VerifyOtpPhoneDto, req.body)
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
            // console.log(checkOtpCode);
            if (checkOtpCode === null) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "code is invalid"
                    }
                )
            }

            // get user and return token
            const userRepository = AppDataSource.getRepository(User);
            const getUser = await userRepository.findOne(
                {
                    where: {mobile_phone: verifyOtpPhone.mobile_phone},
                    select: ['id', 'mobile_phone', "is_active", "is_staff", "is_artist"]    
                }
                )
            if (!getUser) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "user not found"
                    }
                );
            }
            if (!getUser.is_active) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "your account is ben!"
                    }
                );
            }
            const token = funcCreateToken(getUser.id, getUser.is_active);
            return res.status(200).json(
                {
                    status: "success",
                    access_token: token['accessToken'],
                    refresh_token: token['refreshToken'],
                    isAdmin: getUser.is_staff,
                    isArtist: getUser.is_artist
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

// send request otp into email
/**
 * @swagger
 * /v1/auth/user/request_login_by_otp_email:
 *   post:
 *     summary: درخواست کد OTP برای ورود با ایمیل
 *     description: |
 *       این endpoint برای ارسال کد تأیید (OTP) به ایمیل کاربر برای ورود به سیستم استفاده می‌شود.
 *       کاربر باید وجود داشته باشد و حسابش فعال باشد.
 *     tags:
 *       - Authentication
 *       - OTP
 *       - Email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestEmailDto'
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: کد OTP با موفقیت ارسال شد
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
 *                   example: "OTP code sent successfully"
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body must be set"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   error:
 *                     - field: "email"
 *                       value: { isEmail: "email must be an email" }
 *       403:
 *         description: حساب کاربری مسدود شده است
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *             example:
 *               message: "your account is ben!"
 *               status: false
 *       404:
 *         description: کاربر یافت نشد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *             example:
 *               message: "user not found"
 *               status: false
 *       500:
 *         description: خطای سرور داخلی
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: boolean
 *             example:
 *               message: "server error"
 *               status: false
 */
userAuthRouter.post(
    "/request_login_by_otp_email/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        // validate request body
        if (!req.body) {
            return res.status(400).json({message: "request body must be set"});
        }

        // validate data
        const requestEmail = plainToClass(requestEmailDto, req.body);
        const errors = await validate(requestEmail);
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

        const userRepository = AppDataSource.getRepository(User);
        const getUser = await userRepository.findOne({where: {email: requestEmail.email}});

        if (!getUser) {
            return res.status(404).json(
                {
                    message: "user not found",
                    status: false
                }
            );
        }
        if (getUser.is_active === false) {
            return res.status(403).json(
                {
                    message: "your account is ben!",
                    status: false
                }
            );
        }
    }
);


// get profile
userAuthRouter.get(
    "/profile/",
    authenticateJWT,
    funcCheckUserActive,
    async (req: Request, res: Response) => {
        try {
            // user repository and get user
            const userRepository = AppDataSource.getRepository(Profile);
            const getProfile = await userRepository.findOne(
                {
                    where: {user: (req as any).user.user_id},
                    relations: ['user', 'profile_image', 'banner_image', 'banner_galery_image'],
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        birth_date: true,
                        bio: true,
                        jobs: true,
                        social: true,
                        banner_image: {
                            id: true,
                            image_path: true
                        },
                        banner_galery_image: {
                            id: true,
                            image_path: true
                        },
                        profile_image: {
                            id: true,
                            image_path: true
                        },
                        user: {
                            id: true,
                            username: true,
                            email: true,
                            is_artist: true,
                            is_public: true,
                        }
                    }
                }
            )

            if (!getProfile) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "profile ot found"
                    }
                );
            }
            if ((req as any).user.is_active === false) {
                return res.status(403).json(
                    {
                        status: false,
                        message: "your account is ben!"
                    }
                );
            }

            return res.status(200).json(
                {
                    status: "success",
                    data: getProfile
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
});


// update profile
userAuthRouter.patch(
    "/profile/",
    authenticateJWT,
    funcCheckUserActive,
    // checkImageOwnership,
    async (req: Request, res: Response) => {
        try {
            // check json
            if (!req.body) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "request body is required"
                    }
                );
            }

            // get user_id by authenticate jwt
            const userId = (req as any).user_id;
            
            // get repo and user profile
            const profileRepository = AppDataSource.getRepository(Profile);
            const getProfile = await profileRepository.findOne(
                {
                    where: {user: userId},
                    relations: ["profile_image", "banner_image", "banner_galery_image"],
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        jobs: true,
                        social: true,
                        bio: true,
                        birth_date: true,
                        profile_image: {
                            id: true,
                            image_path: true
                        },
                        banner_galery_image: {
                            id: true,
                            image_path: true
                        },
                        banner_image: {
                            id: true,
                            image_path: true
                        }
                    }
                }
            );

            // check profile
            if (!getProfile) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "profile not found"
                    }
                );
            }

            // get data on request body abd validate data
            const profileDto = plainToClass(ProfileDto, req.body);
            const errors = await validate(profileDto);
            if (errors.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Invalid Data",
                        error: errors.map(
                            error => (
                                {
                                    field: error.constraints,
                                    value: error.constraints
                                }
                            )
                        )
                    }
                );
            }
            
            // validate id image
            const imageId = req.body.profile_image_id || req.body.banner_image_id || req.body.banner_galery_image_id;
            const imageRepository = AppDataSource.getRepository(Image);
            const image = await imageRepository.findOne(
                {
                    where: {id: imageId, user: userId},
                    select: {
                        id: true,
                        user: {
                            id: true
                        }
                    }
                }
            )

            if (!image) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "image not found"
                    }
                )
            }

            // update profile
            const allowedFields = ['first_name', 'last_name', 'birth_date', 'bio', 'jobs', 'social', 'profile_image', 'banner_image', 'banner_galery_image'];
            const updateData: Partial<Profile> = {};
            Object.keys(req.body).forEach((key) => {
                    if (allowedFields.includes(key) && req.body[key] !== undefined) {
                    // Handle jobs and social explicitly to ensure array format
                    if (key === "jobs" || key === "social") {
                        if (Array.isArray(req.body[key]) && req.body[key].every((item: any) => typeof item === "string")) {
                        updateData[key] = req.body[key];
                        } else {
                        updateData[key] = getProfile[key]; // Retain existing value if invalid
                        }
                    } else {
                        updateData[key] = req.body[key];
                    }
                    }
                });
            Object.assign(getProfile, updateData)

            await profileRepository.save(getProfile);
    
            // return data
            return res.status(200).json(
                {
                    status: "success",
                    message: "ok",
                    data: updateData
                }
            );
        } catch (error) {
            return res.status(500).json(
                {
                    status: false,
                    message: "server error",
                    errors: error
                }
            );
        }
    }
);

// reset password
/**
 * @swagger
 * /v1/auth/user/reset_password:
 *   post:
 *     summary: تغییر رمز عبور کاربر
 *     description: |
 *       این endpoint برای تغییر رمز عبور کاربر استفاده می‌شود.
 *       کاربر باید لاگین کرده باشد و رمز عبور قبلی را صحیح وارد کند.
 *       رمز عبور جدید و تأیید آن باید یکسان باشند.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordDto'
 *           example:
 *             old_password: "OldPassword123!"
 *             new_password: "NewPassword456!"
 *             confirm_password: "NewPassword456!"
 *     responses:
 *       200:
 *         description: رمز عبور با موفقیت تغییر کرد
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
 *                   example: "change password successfully"
 *       400:
 *         description: خطای درخواست
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
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       constraints:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   message: "request body is required"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Validation Field"
 *                   errors:
 *                     - field: "old_password"
 *                       constraints: { isString: "old_password must be a string", isNotEmpty: "old_password should not be empty" }
 *               wrongOldPassword:
 *                 value:
 *                   status: false
 *                   message: "old password is wrong"
 *               passwordNotMatch:
 *                 value:
 *                   status: false
 *                   message: "password not same"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Unauthorized"
 *       403:
 *         description: حساب کاربری غیرفعال است
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Account is deactivated"
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
 *                 error:
 *                   type: string
 *             example:
 *               status: false
 *               message: "server error"
 *               error: "Error message details"
 */
userAuthRouter.post(
    "/reset_password/",
    authenticateJWT,
    funcCheckUserActive,
    async (req: Request, res: Response) => {
        try {
            if (!req.body) {
                return res.status(400).json(
                    {
                        message: "request body is required"
                    }
                )
            }
            const resetPasswordDto = plainToClass(ResetPasswordDto, req.body);
            const error = await validate(resetPasswordDto);

            if (error.length > 0) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "Validation Field",
                        errors: error.map(
                            err => (
                                {
                                    field: err.property,
                                    constraints: err.constraints
                                }
                            )
                        )
                    }
                );
            }

            // get user
            const userRepository = AppDataSource.getRepository(User);
            const userId = (req as any).user.user_id
            const user = await userRepository.findOne(
                {
                    where: {id: Number(userId)},
                    select: ['id', 'password']
                }
            )

            // check old password
            const hashOldPassword = funcCreateHashPassword(resetPasswordDto.old_password)
            const isOldPasswordValid = hashOldPassword === user.password
            if (!isOldPasswordValid) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "old password is wrong"
                    }
                );
            }

            // check new_password and confirm_password
            if (resetPasswordDto.new_password !== resetPasswordDto.confirm_password) {
                return res.status(400).json(
                    {
                        status: false,
                        message: "password not same"
                    }
                )
            }

            // save new password
            user.password = resetPasswordDto.new_password;
            await user.save();
            return res.status(200).json(
                {
                    status: "success",
                    message: "change password successfully"
                }
            );
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

// user notification
/**
 * @swagger
 * /v1/auth/user/notifications:
 *   get:
 *     summary: دریافت نوتیفیکیشن‌های کاربر
 *     description: |
 *       این endpoint برای دریافت لیست نوتیفیکیشن‌های کاربر با قابلیت صفحه‌بندی استفاده می‌شود.
 *       کاربر باید لاگین کرده باشد.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: شماره صفحه برای صفحه‌بندی
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه (حداکثر 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست نوتیفیکیشن‌ها با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         description: عنوان نوتیفیکیشن
 *                         example: "به روزرسانی جدید"
 *                       body:
 *                         type: string
 *                         description: محتوای نوتیفیکیشن
 *                         example: "یک به روزرسانی جدید برای اپلیکیشن موجود است"
 *                       notification_redirect_url:
 *                         type: string
 *                         nullable: true
 *                         description: URL جهت redirect نوتیفیکیشن
 *                         example: "https://example.com/update"
 *                       notification_type:
 *                         type: string
 *                         description: نوع نوتیفیکیشن
 *                         example: "system_update"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     totalItem:
 *                       type: integer
 *                       example: 95
 *                     itemPerPage:
 *                       type: integer
 *                       example: 20
 *                     hasNext:
 *                       type: boolean
 *                       example: true
 *                     hasPrev:
 *                       type: boolean
 *                       example: false
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Unauthorized"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.get(
    "/notifications/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            // get user_id
            const userId = (req as any).user.user_id;
            // get data and pagination
            const page = (req.query.page as string) || 1; // current page
            const limit = parseInt(req.query.limit as string) || 20; // item in page
            const skip = (Number(page) - 1) * limit; // calc item skip
            const notificationRepository = AppDataSource.getRepository(UserNotification);
            const [notification, totalCount] = await notificationRepository.findAndCount(
                {
                    where: {
                        user: {
                            id: userId
                        }, 
                        is_active: true
                    },
                    select: {
                        id: true,
                        title: true,
                        body: true,
                        notification_redirect_url: true,
                        notification_type: true,
                    },
                    skip: skip,
                    take: limit
            }
        );

        // calc pagination
        const totalPage = Math.ceil(totalCount / Number(limit));
        const hasNext = Number(page) < totalPage;
        const hasPrev = Number(page) > 1

        return res.status(200).json(
            {
                status: "success",
                data: notification,
                pagination: {
                    currentPage: page,
                    totalPages: totalPage,
                    totalItem: totalCount,
                    itemPerPage: limit,
                    hasNext: hasNext,
                    hasPrev: hasPrev
                }
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

// detail user notification
/**
 * @swagger
 * /v1/auth/user/notifications/{id}:
 *   get:
 *     summary: دریافت جزئیات یک نوتیفیکیشن خاص
 *     description: |
 *       این endpoint برای دریافت جزئیات یک نوتیفیکیشن خاص بر اساس شناسه آن استفاده می‌شود.
 *       کاربر باید لاگین کرده باشد و فقط می‌تواند نوتیفیکیشن‌های خود را مشاهده کند.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: شناسه نوتیفیکیشن
 *         example: 123
 *     responses:
 *       200:
 *         description: جزئیات نوتیفیکیشن با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: شناسه نوتیفیکیشن
 *                       example: 123
 *                     title:
 *                       type: string
 *                       description: عنوان نوتیفیکیشن
 *                       example: "به روزرسانی جدید"
 *                     body:
 *                       type: string
 *                       description: محتوای نوتیفیکیشن
 *                       example: "یک به روزرسانی جدید برای اپلیکیشن موجود است"
 *                     notification_redirect_url:
 *                       type: string
 *                       nullable: true
 *                       description: URL جهت redirect نوتیفیکیشن
 *                       example: "https://example.com/update"
 *                     notification_type:
 *                       type: string
 *                       description: نوع نوتیفیکیشن
 *                       example: "system_update"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: تاریخ ایجاد نوتیفیکیشن
 *                       example: "2023-10-05T12:34:56.789Z"
 *       400:
 *         description: شناسه نوتیفیکیشن نامعتبر است
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
 *                   example: "Invalid notification ID"
 *       401:
 *         description: عدم احراز هویت
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: "Unauthorized"
 *       404:
 *         description: نوتیفیکیشن پیدا نشد
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
 *                   example: "Notification not found"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.get(
    "/notifications/:id",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.user_id;
            const notificationId = parseInt(req.params.id);

            if (isNaN(notificationId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid notification ID"
                });
            }

            const notificationRepository = AppDataSource.getRepository(UserNotification);
            
            // find user notification
            const notification = await notificationRepository.findOne({
                where: {
                    id: notificationId,
                    user: { id: userId },
                    is_active: true
                },
                select: {
                    id: true,
                    title: true,
                    body: true,
                    notification_redirect_url: true,
                    notification_type: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            // check notification dose exists
            if (!notification) {
                return res.status(404).json({
                    status: false,
                    message: "Notification not found"
                });
            }

            return res.status(200).json({
                status: "success",
                data: notification
            });

        } catch (error) {
            console.error("Get notification detail error:", error);
            return res.status(500).json({
                status: false,
                message: "server error"
            });
        }
    }
);

// verify change password
/**
 * @swagger
 * /v1/auth/user/confirm_forget_password:
 *   post:
 *     summary: تأیید فراموشی رمز عبور و تنظیم رمز جدید
 *     description: |
 *       این endpoint برای تأیید کد OTP و تنظیم رمز عبور جدید پس از فراموشی رمز استفاده می‌شود.
 *       کاربر نیازی به احراز هویت ندارد.
 *     tags:
 *       - Authentication
 *       - Password Recovery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmForgetPasswordDto'
 *           example:
 *             code: 123456
 *             new_password: "NewPassword123!"
 *             confirm_new_password: "NewPassword123!"
 *             mobile_phone: "09123456789"
 *     responses:
 *       200:
 *         description: رمز عبور با موفقیت تغییر کرد و توکن‌ها بازگردانده شدند
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
 *                   example: "successfully change password"
 *                 access_token:
 *                   type: string
 *                   description: توکن دسترسی جدید (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: توکن رفرش جدید (JWT)
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: خطای اعتبارسنجی داده‌ها
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
 *                 error:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       value:
 *                         type: object
 *             examples:
 *               invalidBody:
 *                 value:
 *                   status: false
 *                   message: "request body must be not null"
 *               validationError:
 *                 value:
 *                   status: false
 *                   message: "Invalid Data"
 *                   error:
 *                     - field: "code"
 *                       value: { isNumber: "code must be a number", isNotEmpty: "code should not be empty" }
 *               passwordNotMatch:
 *                 value:
 *                   status: false
 *                   message: "password must be same"
 *       403:
 *         description: حساب کاربری مسدود شده است
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
 *             example:
 *               status: false
 *               message: "your account is ben!"
 *       404:
 *         description: کد OTP نامعتبر یا کاربر یافت نشد
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
 *             examples:
 *               invalidOtp:
 *                 value:
 *                   status: false
 *                   message: "code is invalid"
 *               userNotFound:
 *                 value:
 *                   status: false
 *                   message: "user not found"
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
 *             example:
 *               status: false
 *               message: "server error"
 */
userAuthRouter.post(
    "/confirm_forget_password/",
    notAuthenticateJwt,
    async (req: Request, res: Response) => {
        if (!req.body) {
            return res.status(400).json(
                {
                    status: false,
                    message: "request body must be not null"
                }
            )
        }

        // validate data
        const confirmForgetPassword = plainToClass(confirmForgetPasswordDto, req.body);
        const errors = await validate(confirmForgetPassword);
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

        if (confirmForgetPassword.confirm_new_password !== confirmForgetPassword.new_password) {
            return res.status(400).json(
                {
                    status: false,
                    message: "password must be same"
                }
            )
        }

        const changePassword = funcCreateHashPassword(confirmForgetPassword.confirm_new_password);
        const checkOtpCode = await VerifyOtpRedis(confirmForgetPassword.code, req.ip)

        if (checkOtpCode === null) {
                return res.status(404).json(
                    {
                        status: false,
                        message: "code is invalid"
                    }
                )
            }
            
        // check user
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne(
            {
                where: {mobile_phone: confirmForgetPassword.mobile_phone},
                select: ['id', "mobile_phone", "is_active"]
            }
        )

        if (!user) {
            return res.status(404).json(
                {
                    status: false,
                    message: "user not found"
                }
            )
        }
        
        if (!user.is_active) {
            return res.status(403).json(
                {
                    status: false,
                    message: "your account is ben!"
                }
            )
        }

        user.password = funcCreateHashPassword(confirmForgetPassword.confirm_new_password);
        await user.save();

        const token = funcCreateToken(user.id, user.is_active)
        return res.status(200).json(
            {
                status: "success",
                message: "successfully change password",
                access_token: token['accessToken'],
                refresh_token: token['refreshToken']

            }
        )

});

// all user
/**
 * @swagger
 * /v1/auth/user/all_user/:
 *   get:
 *     summary: دریافت لیست تمام کاربران فعال
 *     description: |
 *       این endpoint برای دریافت لیست تمام کاربران فعال سیستم با اطلاعات پایه پروفایل استفاده می‌شود.
 *       نیاز به احراز هویت JWT دارد.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: تعداد آیتم‌ها در هر صفحه (حداکثر 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: لیست کاربران با موفقیت بازگردانده شد
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: شناسه کاربر
 *                         example: 1
 *                       username:
 *                         type: string
 *                         description: نام کاربری
 *                         example: "john_doe"
 *                       profile:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: شناسه پروفایل
 *                             example: 1
 *                           profile_image:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 description: شناسه تصویر پروفایل
 *                                 example: 5
 *                               image_path:
 *                                 type: string
 *                                 description: مسیر تصویر پروفایل
 *                                 example: "https://example.com/images/profile.jpg"
 *                 page:
 *                   type: integer
 *                   description: شماره صفحه فعلی (همیشه 1)
 *                   example: 1
 *                 count:
 *                   type: integer
 *                   description: تعداد کل کاربران فعال
 *                   example: 150
 *       401:
 *         description: عدم احراز هویت
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
 */
userAuthRouter.get(
    "/all_user/",
    authenticateJWT,
    async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const page = 1;
            const skip = (page - 1) * limit;
            const userRepository = AppDataSource.getRepository(User);

            // count data
            const count = await userRepository.count(
                {
                    where: {is_active: true}
                }
            );

            // join data
            const allUser = await userRepository
            .createQueryBuilder("user")
            .leftJoinAndSelect("user.profile", "profile")
            .leftJoinAndSelect("profile.profile_image", "profile_image")
            .select([
            "user.id",
            "user.username",
            "profile.id",
            "profile_image.id",
            "profile_image.image_path",
            ])
            .where("user.is_active = :active", { active: true })
            .orderBy("user.id", "ASC")
            .skip(skip)
            .take(limit)
            .getMany();
            // return data
            return res.status(200).json(
                {
                    status: "success",
                    data: allUser,
                    page: page,
                    count: count
                }
            )
        } catch (error) {
            return res.status(500).json(
                {
                    message: "server error",
                    status: false
                }
            )
        }
    }
)

export {
    userAuthRouter
}
