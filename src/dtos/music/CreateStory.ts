import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateStoryDto {
    @IsArray()
    @IsNotEmpty()
    @ArrayMinSize(1)
    media_ids: number[]
}
