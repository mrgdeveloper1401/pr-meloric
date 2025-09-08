import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAlbumDto {
    @IsString()
    @IsNotEmpty()
    title: string

    @IsString()
    @IsNotEmpty()
    bio: string;

    @IsNumber()
    @IsNotEmpty()
    cover_image: number;

    @IsString()
    @IsNotEmpty()
    release_date: string;

    @IsArray()
    @IsNotEmpty()
    genre_ids: number;

    @IsBoolean()
    @IsOptional()
    is_active: boolean;
}
