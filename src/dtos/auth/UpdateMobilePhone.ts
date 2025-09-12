import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class UpdateMobilePhoneDto {
    @IsString()
    @IsNotEmpty()
    mobile_phone: string;
}


export class ChangeAndConfirmMobilePhone {
    @IsNotEmpty()
    @IsNumber()
    code: number;

    @IsString()
    @IsNotEmpty()
    mobile_phone: string;
}