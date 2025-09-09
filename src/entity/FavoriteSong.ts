import {Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./User";
import { Song } from "./Song";
import { TimestampEntity } from "./Abstract";


@Entity()
@Unique(['user', 'song'])
export class FavoriteSong extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "user_id"})
  user: User;

  @ManyToOne(() => Song, {onDelete: "RESTRICT"})
  @JoinColumn({name: "song_id"})
  song: Song;
};
