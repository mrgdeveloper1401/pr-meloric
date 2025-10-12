import { IsNotEmpty, IsNumber } from "class-validator";

export class DownloadMusicDto {
    @IsNumber()
    @IsNotEmpty()
    music_id: number
}
