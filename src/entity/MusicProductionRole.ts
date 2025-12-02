// entities/SongProductionRole.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { TimestampEntity } from "./Abstract";
import { Song } from "./Song";
import { Artist } from "./Artist";

export enum ProductionRoleType {
  MIXER = "mixer", // میکسر
  MASTERING = "mastering", // مسترینگ
  PRODUCER = "producer", // تولیدکننده
  DIRECTOR = "director", // کارگردان
  COMPOSER = "composer", // آهنگساز
  ARRANGER = "arranger", // تنظیم کننده
  SOUND_DESIGNER = "sound_designer", // طراح صدا
  LYRICIST = "lyricist", // ترانه‌سرا
  OTHER = "other", // سایر
}

@Entity()
export class SongProductionRole extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Song, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "song_id" })
  song: Song;

  @ManyToOne(() => Artist, artist => artist.production_roles, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "artist_id" })
  artist: Artist;

  @Column({ 
    type: "varchar", 
    length: 50 
  })
  @Index()
  role: string; // "mixer", "mastering", "producer", "director" و ...

  @Column({ length: 100, nullable: true })
  custom_role_title: string;

  @Column({ default: true })
  is_active: boolean;
}