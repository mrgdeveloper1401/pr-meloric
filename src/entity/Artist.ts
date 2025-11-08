import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import { User } from "./User";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";
import { ArtistGallery } from "./ArtistGallery";

@Entity()
export class Artist extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, {onDelete: "RESTRICT", nullable: false})
  @JoinColumn({name: "user_id"})
  user: User;

  @Column({ default: true })
  is_active: boolean;

  @Column({default: 0, nullable: true})
  monthly_listeners: number;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "image_id"})
  cover_image: Image;

  @OneToMany(() => ArtistGallery, gallery => gallery.artist)
  gallery_images: ArtistGallery[];

  @Column({ length: 400, nullable: true})
  bio: string;

  @Column({nullable: true, length: 100})
  nick_name: string

}