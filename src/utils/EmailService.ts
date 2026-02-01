import nodemailer from "nodemailer";
import crypto from "crypto";
import { otpManagerClass } from "./connectRedis";

interface EmailOption {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const EMAIL_HOST = process.env.EMAIL_HOST as string;
const EMAIL_PORT = Number(process.env.EMAIL_PORT) as number;
const USE_SECURE = Boolean(process.env.USE_SECURE) as boolean;
const EMAIL_USER = process.env.EMAIL_USER as string;
const EMAIL_PASS = process.env.EMAIL_PASS as string;
const FROM_EMAIL = process.env.FROM_EMAIL as string;

// const EMAIL_HOST="localhost"
// const EMAIL_PORT=1025
// const USE_SECURE=false
// const EMAIL_USER="test"
// const EMAIL_PASS="test"
// const FROM_EMAIL="test@example.com"

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const transporterOptions = {
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: USE_SECURE,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    };
    this.transporter = nodemailer.createTransport(transporterOptions);
  }

  private async verifyTransporter() {
    try {
      await this.transporter.verify();
    } catch (error) {
      throw new Error(error);
    }
  }

  async sendEmail(options: EmailOption) {
    try {
      await this.transporter.sendMail({
        from: FROM_EMAIL, // FROM_EMAIL
        to: options.to,
        subject: options.text,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (error) {
      throw new Error(error);
    }
  }

  generateOtpCode() {
    return crypto.randomInt(111111, 999999);
  }

  // store email otp in redis
  async storeEmailOtp(email: string, ipAddress: string, store_type: string) {
    const code = this.generateOtpCode();
    await otpManagerClass.storeOtp(email, code, ipAddress, store_type);
    return code;
  }

  async verifyEmailOtp(email: string, code: number, ipAddress: string, store_type: string) {
    return await otpManagerClass.verifyOtp(email, code, ipAddress, store_type);
  }
}

export const createEmailService = new EmailService();
