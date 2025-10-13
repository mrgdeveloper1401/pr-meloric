import { Express, Request, Response } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { version } from "../../package.json";
import path from "path";


const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "REST API DOCS",
            version
        },
        components: {
            securitySchemes: { // ✅ تصحیح شده
                bearerAuth: {
                    type: "http",
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [
            {
                bearerAuth: []
            },
        ]
    },
    apis: [
        path.join(__dirname, '../config/swaggerSchemas.ts'),
        path.join(__dirname, '../router/v1/user/auth/*.ts'),
        path.join(__dirname, '../router/v1/user/follow/*.ts'),
        path.join(__dirname, '../dtos/auth/*.ts'),
        path.join(__dirname, "../router/v1/core/*.ts"),
        path.join(__dirname, "../router/v1/user/music/*.ts"),
        path.join(__dirname, "../router/v1/user/wallet/*.ts")
    ]
}

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app: Express, port: string){
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.get('docs.json', (req: Request, res: Response) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });

    // log.info(`docs available at http://localhost:${port}/docs`);
}

export default swaggerDocs;