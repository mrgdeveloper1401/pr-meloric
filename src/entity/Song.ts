import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn, JoinTable, ManyToMany, OneToMany } from "typeorm";
import { Album } from "./Album";
import { Artist } from "./Artist";
import { TimestampEntity } from "./Abstract";
import { Audio } from "./Audio";
import { Image } from "./Image";
import { SongProductionRole } from "./MusicProductionRole";

@Entity()
export class Song extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Artist, {onDelete: "RESTRICT"})
  @JoinColumn({name: "artist_id"})
  artist: Artist;

  @ManyToOne(() => Album, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "album_id"})
  album: Album;

  @Column({ length: 255 })
  title: string;

  @Column()
  release_date: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column()
  play_count: number;

  @Column({nullable: true})
  music_lyrics: string

  @ManyToOne(() => Audio)
  @JoinColumn({name: "audio_id"})
  audio: Audio

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "image_id"})
  image: Image

  @Column({default: false, name: "is_single"})
  is_single: boolean;

  @ManyToMany(() => Artist, { nullable: true })
  @JoinTable({
    name: "song_featured_artists",
    joinColumn: {
      name: "song_id",
      referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "artist_id",
      referencedColumnName: "id"
    }
  })
  featured_artists: Artist[];

  @OneToMany(() => SongProductionRole, productionRole => productionRole.song)
  production_roles: SongProductionRole[];
}