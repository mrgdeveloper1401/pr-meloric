import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, JoinColumn } from "typeorm";
import { User } from "./User";
import { Song } from "./Song";
import { TimestampEntity } from "./Abstract";

@Entity()
export class Comment extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "user_id"})
  user: User;

  @ManyToOne(() => Song, {onDelete: "RESTRICT"})
  @JoinColumn({name: "song_id"})
  song: Song;

  @Column('text')
  body: string;

  @Column({ default: true })
  is_active: boolean;

}