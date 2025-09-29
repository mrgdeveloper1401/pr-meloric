import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateStoryDto {
    @IsString()
    caption?: string;

    @IsArray()
    @IsNotEmpty()
    @ArrayMinSize(1)
    media_ids: number[]
}
