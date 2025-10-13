import { IsNotEmpty, IsNumber } from "class-validator";

export class FollowDto {
    @IsNumber()
    @IsNotEmpty()
    to_user_id: number
}
