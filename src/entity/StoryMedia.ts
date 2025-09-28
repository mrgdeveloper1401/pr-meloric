import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";
import { User } from "./User";

export enum MediaTypeEnum {
    VIDEO = "video",
    IMAGE = "image"
}

@Entity({name: "media"})
export class StoryMedia extends TimestampEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({type: "varchar", length: 500})
    file_path: string;

    @ManyToOne(() => User, {onDelete: "RESTRICT"})
    @JoinColumn({name: "user_id"})
    user: User

    @Column({type: "varchar", length: 30})
    mime_type: string;

    @Column({type: "int"})
    size: number;

    @Column({ default: true, type: "boolean" })
    is_active: boolean;

    @Column({type: "float"})
    duration: number;
    
    @Column({
        type: "enum",
        enum: MediaTypeEnum,
        default: MediaTypeEnum.IMAGE
    })
    media_type: MediaTypeEnum;
}