import { Column ,Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { User } from "./User";

@Entity()
export class Audio extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  audio_file_path: string;

  @Column()
  size: number;

  @Column()
  hash: string;

  @Column()
  duration: number;

  @Column({ length: 10 })
  audio_format: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => User)
  @JoinColumn({name: "user_id"})
  user: User;

}