import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateMusicDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    release_date?: string;

    @IsString()
    @IsOptional()
    music_lyrics?: string;

    @IsNumber()
    @IsOptional()
    audio_id?: number;
}
