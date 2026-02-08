import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./User";
// import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";
import { Image } from "./Image";

@Entity()
export class Profile extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', {array: true, nullable: true })
  jobs: string[];

  @Column('varchar', {array: true, nullable: true })
  social: string[];

  @OneToOne(() => User, (user_id) => user_id.profile, {onDelete: "RESTRICT", nullable: false})
  @JoinColumn({name: "user_id"})
  user: User;

  // @ManyToOne(() => Image, (image) => image.profile_image_set,{ nullable: true , onDelete: "RESTRICT"})
  // @JoinColumn({ name: 'profile_image_id' })
  // profile_image: Image;

  @ManyToOne(() => Image, { nullable: true , onDelete: "RESTRICT"})
  @JoinColumn({ name: 'banner_image_id' })
  banner_image: Image;

  // @ManyToOne(() => Image, (image) => image.profile_banner_galery_image_set, { nullable: true ,onDelete: "RESTRICT"})
  // @JoinColumn({ name: 'banner_galery_image_id' })
  // banner_galery_image: Image;
}