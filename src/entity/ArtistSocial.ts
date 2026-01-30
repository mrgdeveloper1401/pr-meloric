// entities/ArtistSocial.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Artist } from "./Artist";
import { TimestampEntity } from "./Abstract";

@Entity()
export class ArtistSocial extends TimestampEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Artist, artist => artist.social_links, { onDelete: "CASCADE" })
  @JoinColumn({ name: "artist_id" })
  artist: Artist;

  @Column({ length: 50 })
  platform: string;

  @Column({ length: 500 })
  url: string;

  @Column({ default: true })
  is_active: boolean;
}