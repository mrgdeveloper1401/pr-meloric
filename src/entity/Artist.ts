import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import { User } from "./User";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";
import { ArtistGallery } from "./ArtistGallery";
import { ArtistSocial } from "./ArtistSocial";
import { SongProductionRole } from "./MusicProductionRole";

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
  @JoinColumn({name: "cover_image_id"})
  cover_image: Image;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "profile_image_id"})
  profile_image: Image;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "banner_image_id"})
  banner_image: Image;

  @OneToMany(() => ArtistGallery, gallery => gallery.artist)
  gallery_images: ArtistGallery[];

  @OneToMany(() => ArtistSocial, social => social.artist)
  social_links: ArtistSocial[];

  @Column({ length: 400, nullable: true})
  bio: string;

  @Column({nullable: true, length: 100})
  nick_name: string

  @Column({ length: 100, nullable: true})
  first_name: string;

  @Column({ length: 100, nullable: true })
  last_name: string;

  @OneToMany(() => SongProductionRole, production => production.song)
  production_roles: SongProductionRole[];
}