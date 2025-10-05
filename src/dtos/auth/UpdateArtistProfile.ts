import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateArtistProfile {
    @IsNumber()
    @IsOptional()
    cover_image: number

    @IsString()
    @IsOptional()
    bio: string;

    @IsString()
    @IsOptional()
    nick_name?: string
}
