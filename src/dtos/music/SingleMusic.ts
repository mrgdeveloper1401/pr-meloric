// dto/music/SingleMusicDto.ts
import { 
  IsNotEmpty, 
  IsNumber, 
  IsString, 
  IsArray, 
  IsOptional, 
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ProductionRoleDto {
  @IsNumber()
  @IsNotEmpty()
  artist_id: number;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  custom_role_title?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class SingleMusicDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  release_date: string;

  @IsString()
  @IsNotEmpty()
  music_lyrics: string;

  @IsNumber()
  @IsNotEmpty()
  audio_id: number;

  @IsNumber()
  @IsNotEmpty()
  image_id: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductionRoleDto)
  production_roles?: ProductionRoleDto[];

  @IsArray()
  @IsOptional()
  @Type(() => Number)
  featured_artist_ids?: number[];

}