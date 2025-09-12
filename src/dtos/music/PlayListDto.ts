import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePLayListDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;
}