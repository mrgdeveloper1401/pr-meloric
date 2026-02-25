import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";

enum GatewayStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

enum GatewayTransactionType {
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
  PURCHASE = "purchase",
  REFUND = "refund",
}

@Entity({ name: "gateway_transactions" })
@Index(["user", "createdAt"])
@Index(["gatewayName", "status"])
@Index(["user"])
export class GateWayTransaction extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    name: "gateway_name",
  })
  gatewayName: string;

  // transaction type enum
  @Column({
    type: "enum",
    enum: GatewayTransactionType,
    name: "transaction_type",
    default: GatewayTransactionType.DEPOSIT,
  })
  transactionType: GatewayTransactionType;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  amount: number;

  @Column({
    name: "gateway_transaction_id",
    length: 100,
    nullable: true,
  })
  gatewayTransactionId: string;

  @Column({
    type: "enum",
    enum: GatewayStatus,
    default: GatewayStatus.PENDING,
  })
  status: GatewayStatus;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  balance_after: number;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  balance_before: number;

  @Column({
    type: "text",
    nullable: true,
  })
  description: string;

  @Column({
    type: "jsonb",
    nullable: true,
    name: "gateway_response",
  })
  gatewayResponse: object;

  @Column({ default: true })
  is_active: boolean;
}
