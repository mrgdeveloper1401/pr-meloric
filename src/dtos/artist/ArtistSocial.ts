import { IsOptional, IsString } from "class-validator";

export class ArtistSocialDto {
    @IsString()
    @IsOptional()
    platform?: string;

    @IsString()
    @IsOptional()
    url?: string;
}