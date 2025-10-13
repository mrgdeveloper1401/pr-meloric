import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { Image } from "./Image";
import { TimestampEntity } from "./Abstract";
import { StoryMedia } from "./StoryMedia";


@Entity({ name: "stories" })
export class Story extends TimestampEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: "varchar", length: 500, nullable: true })
    caption: string;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: "timestamp" })
    expires_at: Date;

    @Column({ default: 0 })
    view_count: number;

    @OneToMany(() => StoryMedia, storyMedia => storyMedia.story, { cascade: false })
    media: StoryMedia[];
}
