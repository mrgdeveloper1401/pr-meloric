import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";


@Entity({ name: "stories" })
export class Story extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

   @ManyToOne(() => Image, {onDelete: "RESTRICT"})
   @JoinColumn({name: "image_story_id"})
   image_story: Image;

  @Column({ type: "varchar", length: 500, nullable: true })
  caption: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "timestamp"})
  expires_at: Date;

  @Column({ default: 0 })
  view_count: number;
}
