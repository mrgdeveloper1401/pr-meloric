import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { Song } from "./Song";
import { User } from "./User";

@Entity()
export class DownloadMusics extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Song, { onDelete: "CASCADE"})
  @JoinColumn({ name: "song_id" })
  song: Song;

  // @Column({ default: 0 })
  // download_count: number;

  @Column({ default: true })
  is_active: boolean;
}
