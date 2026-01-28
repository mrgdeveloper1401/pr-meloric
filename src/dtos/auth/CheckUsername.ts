import { IsNotEmpty, IsString } from "class-validator";

export class CheckUsernameDto {
    @IsString()
    @IsNotEmpty()
    username: string;
}
