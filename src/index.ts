import { AppDataSource } from "./data-source";
import { blue } from "colors";
import express, { Request, Response } from 'express';
import dotenv from "dotenv";
import { userAuthRouter } from "./router/v1/user/auth/auth_router";
import bodyParser from "body-parser";
import { followRouter } from "./router/v1/user/follow/follow_routers";
import swaggerDocs from "./config/swagger";
import { coreRouter } from "./router/v1/core/core_router";
import { storyRouter } from "./router/v1/user/music/story_router";
import { genreRouter } from "./router/v1/user/music/GenreRouter";
import { albumRouter } from "./router/v1/user/music/albumRouter";
import { musicRouter } from "./router/v1/user/music/music_router";
import { favoriteRouter } from "./router/v1/user/music/FavoritRouter";
import { CorsOptionsMiddleware } from "./middlewares/CorsMiddlewere";
import cors from "cors";
import { commentMusicRouter } from "./router/v1/user/music/CommentRouter";
import { playListRouter } from "./router/v1/user/music/PlayList";
import { playHistoryRouter } from "./router/v1/user/music/PlayHistory";
import { informationUserRouter } from "./router/v1/user/auth/InformationUser";
import { suggestRouter } from "./router/v1/user/music/SuggestionRouter";

dotenv.config()

const debug = process.env.DEBUG

AppDataSource.initialize().then(() => {
    console.log(blue("success connect database"));
    console.log("Here you can setup and run express / fastify / any other framework.")

    // express
    const app = express()
    if (debug) {
        app.use(cors());
    } else {
        app.use(cors(CorsOptionsMiddleware));
    }
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    const port = process.env.PORT;

    // router
    app.get(
        "/", (req: Request, res: Response) => {
            res.send("rest api music");
        }
    );
    app.use(
        "/v1/auth/user/", userAuthRouter
    );
    app.use(
        "/v1/follow/user/", followRouter
    );
    app.use(
        "/v1/user/core/",
        coreRouter
    );
    app.use(
        "/v1/user/story/",
        storyRouter
    );
    app.use(
        "/v1/user/genre/",
        genreRouter
    );
    app.use(
        "/v1/user/album/",
        albumRouter
    );
    app.use(
        "/v1/user/music/",
        musicRouter
    );
    app.use(
        "/v1/user/favorite/",
        favoriteRouter
    );
    app.use(
        "/v1/user/comment_music/",
        commentMusicRouter
    );
    app.use(
        "/v1/user/play_list/",
        playListRouter
    );
    app.use(
        "/v1/user/play/",
        playHistoryRouter
    )
    app.use(
        "/v1/user/information/",
        informationUserRouter
    )
    app.use(
        "/v1/suggestion/music/",
        suggestRouter
    )
    // listen
    app.listen(port)

    // swagger
    swaggerDocs(app, port);

}).catch(error => console.log(error))
