import nodemailer from "nodemailer"
import crypto from "crypto"
import { otpManagerClass } from "./connectRedis";


interface EmailOption {
    to: string;
    subject: string;
    text: string;
    html?: string;
}


const HOST = process.env.EMAIL_HOST
const PORT = process.env.EMAIL_PORT
const SECURE = process.env.USE_SECURE
const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS
const FROM_EMAIL = process.env.FROM_EMAIL


export class EmailService {
    private transporter: nodemailer.Transporter;
    
    constructor(){
        this.transporter = nodemailer.createTransport(
            {
                host: HOST,
                port: PORT,
                secure: SECURE,
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS
                }
            }
        );
    }

    async sendEmail(options: EmailOption) {
        try {
            await this.transporter.sendMail(
                {
                    from: FROM_EMAIL,
                    to: options.to,
                    subject: options.text,
                    text: options.text,
                    html: options.html
                }
            );
            return true
        } catch (error) {
            throw new Error(error);
        }
    }

    generateOtpCode() {
        return crypto.randomInt(999999);
    }

    async storeEmailOtp(email: string, ipAddress: string){
        const code = this.generateOtpCode();
        await otpManagerClass.storeOtp(email, code, ipAddress);
    }

    async verifyEmailOtp(email: string, code: number, ipAddress: string){
        return await otpManagerClass.verifyOtp(email, code, ipAddress);
    }
}

export const createEmailService = new EmailService()