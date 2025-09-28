import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import { Image } from "./Image";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";
import { Genre } from "./Genre";

@Entity()
export class Album extends TimestampEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255 })
  bio: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => Image, {onDelete: "RESTRICT"})
  @JoinColumn({name: "cover_image_id"})
  cover_image: Image;

  @Column()
  release_date: Date;

  @ManyToOne(() => User, {onDelete: "RESTRICT"})
  @JoinColumn({name: "user_id"})
  user: User;

  // @ManyToMany(() => Genre, {eager: true})
  // @JoinTable(
  //   {
  //     name: "album_genres",
  //     joinColumn: {
  //       name: "album_id",
  //       referencedColumnName: "id"
  //     },
  //     inverseJoinColumn: {
  //       name: "genre_id",
  //       referencedColumnName: "id"
  //     }
  //   }
  // )
  // genres: Genre[];
  @ManyToOne(() => Genre, {onDelete: "RESTRICT"})
  @JoinColumn({name: "genre_id"})
  genre: Genre


//   @DeleteDateColumn()
//   deletedAt: Date;
}