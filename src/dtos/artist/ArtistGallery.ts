import { IsArray, IsNotEmpty, IsNumber } from "class-validator";

export class ArtistGalleryImageDto {
    @IsNumber()
    @IsNotEmpty()
    order: number;

    @IsArray()
    @IsNotEmpty()
    image_ids: number[];
}
