import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { Profile } from "./Profile";
import { TimestampEntity } from "./Abstract";
import { UserNotification } from "./UserNotification";
import { IsEmail } from "class-validator";
import { TokenBlock } from "./TokenBlock";
import { Image } from "./Image";
import { Artist } from "./Artist";

@Entity({name: "users"})
export class User extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 15, nullable: true})
  mobile_phone: string;

  @Column({ unique: true, length: 64 })
  @IsEmail({}, { message: "ایمیل معتبر نیست" })
  email: string;

  @Column({ unique: true, length:  64})
  username: string;

  @Column({length: 128})
  password: string;

  @Column({ default: true})
  is_active: boolean;

  // @Column({ default: false})
  // is_verify_email: boolean;

  // @Column({ default: false})
  // is_verify_phone: boolean;

  @Column({ default: false })
  is_staff: boolean;

  @Column({ default: false })
  is_superuser: boolean;

  @Column({ default: false })
  is_artist: boolean;

  @Column({ default: true })
  is_public: boolean;

  @Column({nullable: true})
  last_login: Date;

  @Column({ length: 100, nullable: true})
  first_name: string;

  @Column({ length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ type: 'text', nullable: true })
  bio: string;

  // @Column({ default: true })  // #TODO, add this field
  // is_operatble: boolean;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "profile_image_id"})
  profile_image: Image;

  @ManyToOne(() => Image, {onDelete: "RESTRICT", nullable: true})
  @JoinColumn({name: "cover_image_id"})
  cover_image: Image;

  // profile normal user
  @OneToOne(() => Profile, profile => profile.user)
  profile: Profile;

  @OneToMany(
    () => UserNotification,
    (notification) => notification.user
  )
  user_notifications_set: UserNotification[];

  @OneToMany(() => Image, (image) => image.user)
  user_image_set: Image[];

  @OneToMany(
    () => TokenBlock,
    (token) => token.user_id
  )
  token_block_set: TokenBlock[];

  // profile if user is artist
  @OneToOne(() => Artist, artist => artist.user)
  user_artist_set: Artist;
}
