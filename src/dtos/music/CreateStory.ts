import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateStoryDto {
    @IsString()
    caption?: string;
}
