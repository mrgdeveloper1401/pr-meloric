import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { User } from "./User";
import { TimestampEntity } from "./Abstract";
import { StoryMedia } from "./StoryMedia";


@Entity({ name: "stories" })
export class Story extends TimestampEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ default: true })
    is_active: boolean;

    @Column({ type: "timestamp" })
    expires_at: Date;

    @OneToMany(() => StoryMedia, storyMedia => storyMedia.story, { cascade: false })
    media: StoryMedia[];
}
