import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class ProfileDto {

    @IsOptional()
    @IsString()
    first_name?: string

    @IsOptional()
    @IsString()
    last_name?: string

    @IsOptional()
    @IsString()
    birth_date?: string

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsArray()
    jobs?: string[];

    @IsOptional()
    @IsArray()
    social?: string[];
    
    @IsOptional()
    @IsNumber()
    profile_image_id?: number;

    @IsOptional()
    @IsNumber()
    banner_image_id?: number;

    @IsOptional()
    @IsNumber()
    cover_image_id?: number;
    
    @IsOptional()
    @IsString()
    full_name?: string
}
