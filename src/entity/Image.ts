import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, ManyToOne } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { Profile } from "./Profile";
import { User } from "./User";

@Entity()
export class Image extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  file_name: string;

  @Column({default: true})
  is_active: boolean;

  @Column({length: 500})
  image_path: string;

  @Column({ length: 50 })
  format: string;

  @Column({ length: 50 })
  type: string;

  @Column({default: 0})
  width: number;

  @Column({default: 0})
  height: number;

  @Column({default: 0})
  size: number;

  @ManyToOne(() => User, (image) => image.id, {onDelete: "RESTRICT", nullable: false})
  @JoinColumn({name: "user_id"})
  user: User;

  @OneToMany(
    () => Profile,
    (profile) => profile.profile_image
  )
  profile_image_set: Profile[];

  @OneToMany(
    () => Profile,
    (profile) => profile.banner_image
  )
  profile_banner_image_set: Profile[];

  @OneToMany(
    () => Profile,
    (profile) => profile.banner_galery_image
  )
  profile_banner_galery_image_set: Profile[];
}