import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { User } from "./User";

@Entity({ name: "gateway" })
export class Gateway extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
    unique: true,
  })
  gateway_name: string;

  @Column({
    default: true,
  })
  is_active: boolean;
}

@Entity({ name: "gateway_transaction" })
export class GatewayTransaction extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {onDelete: "RESTRICT", nullable: false})
  @JoinColumn({name: "user_id"})
  user_id: User;

  
}
