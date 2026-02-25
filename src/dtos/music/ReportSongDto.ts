import { IsBoolean, IsNumber } from "class-validator";

export class SongReportDto {
  @IsBoolean()
  is_report: boolean;

  @IsNumber()
  song_id: number;
}
