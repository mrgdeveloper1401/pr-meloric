// dtos/AddSongToPlaylist.dto.ts
import { IsInt, IsOptional, Min } from 'class-validator';

export class AddSongToPlaylistDto {
    @IsInt()
    @Min(1)
    song_id: number;

    // @IsOptional()
    // @IsInt()
    // @Min(0)
    // position?: number;
}
