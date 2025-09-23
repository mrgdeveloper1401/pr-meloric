import {Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";

@Entity()
export class Follow extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  // following
  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "from_user_id"})
  from_user: User;

  // follower
  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "to_user_id"})
  to_user: User;

  // @CreateDateColumn()
  // createdAt: Date;
}
