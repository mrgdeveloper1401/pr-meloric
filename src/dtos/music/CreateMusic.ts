import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";


export class CreateMusicDto {
    @IsNumber()
    @IsNotEmpty()
    audio_id: number;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    music_lyrics?: string;

    @IsString()
    @IsNotEmpty()
    release_date: string

    @IsNumber()
    @IsOptional()
    image_id ?: number;
}