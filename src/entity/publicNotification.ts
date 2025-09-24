import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";


@Entity()
export class PublicNotification extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  body: string;

  @Column({nullable: true})
  notification_redirect_url: string;

  @Column({nullable: true})
  notification_type: string;

  @Column({default: true})
  is_active: boolean;

}