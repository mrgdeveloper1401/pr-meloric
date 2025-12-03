import { IsEmail, IsNotEmpty, IsNumber } from "class-validator";

export class EmailDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;
}


export class VerifyOtpEmailDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsNumber()
    @IsNotEmpty()
    code: number;
}