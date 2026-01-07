import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
} from "typeorm";
import { TimestampEntity } from "./Abstract";
import { User } from "./User";
import { Song } from "./Song";

@Entity()
export class RecentMusic extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => Song, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "song_id"})
  song: Song;
}
