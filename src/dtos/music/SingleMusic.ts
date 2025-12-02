import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class SingleMusicDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    release_date: string;

    @IsString()
    @IsNotEmpty()
    music_lyrics: string;

    @IsNumber()
    @IsNotEmpty()
    audio_id: number;

    @IsNumber()
    @IsNotEmpty()
    image_id: number;
}
