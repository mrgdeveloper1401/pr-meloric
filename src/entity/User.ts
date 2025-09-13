import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column,
  OneToOne,
  OneToMany
} from "typeorm";
import { Profile } from "./Profile";
import { TimestampEntity } from "./Abstract";
import { UserNotification } from "./UserNotification";
import { IsEmail } from "class-validator";
import { TokenBlock } from "./TokenBlock";
import { Image } from "./Image";

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
}
