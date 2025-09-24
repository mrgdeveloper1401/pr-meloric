import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { Image } from "./Image";

@Entity()
export class Genre extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({unique: true})
  name: string;

  @Column('text', {nullable: true})
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => Image, {nullable: true})
  @JoinColumn({name: "genre_image_id"})
  image: Image
}