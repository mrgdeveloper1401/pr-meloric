import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateMusicDto {
    @IsNumber()
    @IsNotEmpty()
    audio_id: number;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    release_date: string
}