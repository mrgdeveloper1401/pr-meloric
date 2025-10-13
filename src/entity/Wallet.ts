import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";

@Entity()
export class Wallet extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ 
    type: "decimal", 
    precision: 15, 
    scale: 2, 
    default: 0 
  })
  balance: number;

  @Column({ default: true })
  is_active: boolean;
}