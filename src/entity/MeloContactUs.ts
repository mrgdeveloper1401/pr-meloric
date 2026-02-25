import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { TimestampEntity } from "./Abstract";

@Entity()
export class MeloricContactUs extends TimestampEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    url: string;

    @Column()
    contact_us_type: string;

    @Column({default: true})
    is_active: boolean;
}