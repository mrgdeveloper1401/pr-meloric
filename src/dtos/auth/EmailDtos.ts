import { IsEmail, IsNotEmpty, IsNumber, IsString } from "class-validator";

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

export class VerifyForgetPasswordEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @IsNotEmpty()
  code: number;

  @IsString()
  @IsNotEmpty()
  new_password: string;

  @IsString()
  @IsNotEmpty()
  confirm_new_password: string;
}
