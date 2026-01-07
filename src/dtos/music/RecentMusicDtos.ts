// dto/music/SingleMusicDto.ts
import { IsNotEmpty, IsNumber } from "class-validator";

export class RecentMusicDto {
  @IsNumber()
  @IsNotEmpty()
  song_id: number;
}
