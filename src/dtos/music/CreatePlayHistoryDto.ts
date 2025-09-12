import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreatePlayHistoryDto{
    @IsNumber()
    @IsNotEmpty()
    song_id: number;

    @IsString()
    @IsNotEmpty()
    played_at: string;
}
