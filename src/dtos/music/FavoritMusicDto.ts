import { IsNotEmpty, IsNumber } from "class-validator";

export class favoriteMusicDto {
    @IsNumber()
    @IsNotEmpty()
    music_id: number;
}
