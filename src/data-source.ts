import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { Profile } from "./entity/Profile";
import { Image } from "./entity/Image";
import { UserNotification } from "./entity/UserNotification";
import { PublicNotification } from "./entity/publicNotification";
import { Follow } from "./entity/Follow";
import { Wallet } from "./entity/Wallet";
import { CartNumber } from "./entity/CartNumber";
import { Audio } from "./entity/Audio";
import { Album } from "./entity/Album";
import { Artist } from "./entity/Artist";
import { Genre } from "./entity/Genre";
import { Playlist } from "./entity/Playlist";
import { PlaylistSong } from "./entity/PlaylistSong";
import { FavoriteSong } from "./entity/FavoriteSong";
import { PlayHistory } from "./entity/PlayHistory";
import { Comment } from "./entity/Comment";
import { Subscription } from "./entity/Subscription";
import { Plan } from "./entity/Plan";
import { PlanFeature } from "./entity/PlanFuture";
import { UserPayment } from "./entity/UserPayment";
import { UserLog } from "./entity/UserLog";
import { Song } from "./entity/Song";
import { Gateway } from "./entity/Gateway";
import { UserSubscriber } from "./utils/Subscriber/UserSubscriber";
import { TokenBlock } from "./entity/TokenBlock";
import { Story } from "./entity/Story";
import dotenv from "dotenv";
import { StoryMedia } from "./entity/StoryMedia";
import { DownloadMusics } from "./entity/Donwloads";
import { WalletTransaction } from "./entity/WalletTransaction";
import { ArtistGallery } from "./entity/ArtistGallery";
import { ArtistSocial } from "./entity/ArtistSocial";
import { SongProductionRole } from "./entity/MusicProductionRole";

dotenv.config();

const DEBUG = process.env.DEBUG_MODE;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: DEBUG === "true" ? "localhost" : process.env.PROD_POSTGRES_HOST,
  port: DEBUG === "true" ? 5434 : Number(process.env.PROD_POSTGRES_PORT),
  username: DEBUG === "true" ? "postgres" : process.env.PROD_POSTGRES_USER,
  password: DEBUG === "true" ? "postgres" : process.env.PROD_POSTGRES_PASSWORD,
  database: DEBUG === "true" ? "new_meloric_db1" : process.env.PROD_POSTGRES_DB,
  synchronize: true,
  logging: "all",
  entities: [
    User,
    Profile,
    Image,
    UserNotification,
    PublicNotification,
    Follow,
    Wallet,
    CartNumber,
    Audio,
    Album,
    Artist,
    Genre,
    Playlist,
    PlaylistSong,
    Song,
    FavoriteSong,
    PlayHistory,
    Comment,
    Subscription,
    Plan,
    PlanFeature,
    UserPayment,
    UserLog,
    Gateway,
    TokenBlock,
    Story,
    StoryMedia,
    DownloadMusics,
    WalletTransaction,
    ArtistGallery,
    ArtistSocial,
    SongProductionRole,
  ],
  migrations: [],
  subscribers: [UserSubscriber],
});
