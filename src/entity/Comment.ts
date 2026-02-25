import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Song } from "./Song";
import { TimestampEntity } from "./Abstract";

// comment
@Entity()
export class Comment extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Song, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "song_id" })
  song: Song;

  @Column("text")
  body: string;

  @Column({ default: true })
  is_active: boolean;
}

// comment report
@Entity({ name: "comment_report" })
@Index(["user"])
@Index(["comment"])
export class CommentReport extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT", nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Comment, { onDelete: "RESTRICT", nullable: false })
  @JoinColumn({ name: "comment_id" })
  comment: Comment;

  @Column({ default: false })
  is_report: boolean;

  @Column({ default: true })
  is_active: boolean;
}
