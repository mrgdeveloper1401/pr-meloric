import { IsNotEmpty, IsNumber } from "class-validator";

export class ArtistGalleryImageDto {
    @IsNumber()
    @IsNotEmpty()
    order: number;

    @IsNumber()
    @IsNotEmpty()
    image_id: number;
}

