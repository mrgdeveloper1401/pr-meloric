import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";

@Entity()
export class Playlist extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "user_id"})
  user: User;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string

  @Column({ default: true })
  is_active: boolean;

}