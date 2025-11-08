// entities/ArtistGallery.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Artist } from "./Artist";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";

@Entity()
export class ArtistGallery extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Artist, artist => artist.gallery_images, { onDelete: "CASCADE" })
  @JoinColumn({ name: "artist_id" })
  artist: Artist;

  @ManyToOne(() => Image, { onDelete: "CASCADE" })
  @JoinColumn({ name: "image_id" })
  image: Image;

  @Column({ type: "int", default: 0 })
  order: number;

  @Column({ default: true })
  is_active: boolean;
}