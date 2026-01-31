import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Playlist } from "./Playlist";
import { Song } from "./Song";
import { TimestampEntity } from "./Abstract";

@Entity()
export class PlaylistSong extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Playlist, {onDelete: "RESTRICT"})
  @JoinColumn({name: "playlist_id"})
  playlist: Playlist;

  @ManyToOne(() => Song, {onDelete: "RESTRICT"})
  @JoinColumn({name: "song_id"})
  song: Song;

  @Column({ default: true })
  is_active: boolean;

}