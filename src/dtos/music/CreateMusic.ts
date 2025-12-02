// create-music.dto.ts
import { 
  IsString, 
  IsDateString, 
  IsInt, 
  IsArray, 
  ArrayMinSize, 
  ArrayMaxSize,
  ValidateNested,
  IsOptional,
  Min,
  MaxLength 
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductionRoleDto {
  @IsInt()
  @Min(1)
  artist_id: number;

  @IsString()
  @MaxLength(50)
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  custom_role_title?: string;
}

export class CreateMusicDto {
  @IsInt()
  @Min(1)
  audio_id: number;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsDateString()
  release_date: string;

  @IsOptional()
  @IsString()
  music_lyrics?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  image_id?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductionRoleDto)
  production_roles?: ProductionRoleDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  featured_artist_ids?: number[];
}