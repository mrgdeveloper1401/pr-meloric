import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import { User } from "./User";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";

@Entity()
export class Artist extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, {onDelete: "RESTRICT", nullable: false})
  @JoinColumn({name: "user_id"})
  user: User;

  @Column({ default: true })
  is_active: boolean;

  @Column({default: 0, nullable: true})
  monthly_listeners: number;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "image_id"})
  cover_image: Image;

  @Column({ length: 400, nullable: true})
  bio: string;

}