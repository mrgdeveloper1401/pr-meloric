import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";

@Entity()
export class WalletTransaction extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ 
    type: "enum", 
    enum: ["deposit", "withdrawal", "purchase", "refund", "supporting_meloric"],
    default: "deposit"
  })
  wallet_type: string;

  @Column({ 
    type: "decimal", 
    precision: 15, 
    scale: 2 
  })
  amount: number;

  @Column({ 
    type: "decimal", 
    precision: 15, 
    scale: 2 
  })
  balance_after: number;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ 
    type: "enum", 
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending"
  })
  status: string;

  @Column({ nullable: true })
  payment_gateway: string;

  @Column({ nullable: true })
  gateway_transaction_id: string;

  @Column({ default: true })
  is_active: boolean;
}