import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateArtistProfile {
    @IsNumber()
    @IsOptional()
    cover_image_id?: number;

    @IsNumber()
    @IsOptional()
    banner_image_id?: number;

    @IsNumber()
    @IsOptional()
    profile_image_id?: number;

    @IsString()
    @IsOptional()
    bio?: string;

    @IsString()
    @IsOptional()
    nick_name?: string;

    @IsString()
    @IsOptional()
    first_name: string;

    @IsString()
    @IsOptional()
    last_name: string;

    @IsString()
    @IsOptional()
    birth_date: string
}
