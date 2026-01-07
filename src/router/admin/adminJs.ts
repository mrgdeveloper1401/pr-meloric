// import AdminJS from "adminjs";
// import AdminJSExpress from "@adminjs/express";
// import Connect from "connect-pg-simple";
// import session from "express-session";
// import express from "express";


// const DEBUG = process.env.DEBUG_MODE || "true";
// const host = DEBUG === "true" ? "localhost": process.env.PROD_POSTGRES_HOST
// const port = DEBUG === "true" ? 5434 : Number(process.env.PROD_POSTGRES_PORT)
// const username = DEBUG === "true" ? "postgres" : process.env.PROD_POSTGRES_USER
// const password = DEBUG === "true" ? "postgres" : process.env.PROD_POSTGRES_PASSWORD
// const database = DEBUG === "true" ? "new_meloric_db1" : process.env.PROD_POSTGRES_DB

// console.log(DEBUG);
// console.log(__dirname);


// const DEFAULT_ADMIN = {
//   email: "mysum325g@gmail.com",
//   password: "admin.1234",
// };

// const authenticate = async (email: string, password: string) => {
//   if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
//     return Promise.resolve(DEFAULT_ADMIN);
//   }
//   return null;
// };

// const start = async (port: number | 8000) => {
//   const app = express();

//   const admin = new AdminJS({});

//   const ConnectSession = Connect(session);
//   const sessionStore = new ConnectSession({
//     conObject: {
//       connectionString: "postgres://adminjs:@localhost:5432/adminjs",
//       ssl: process.env.NODE_ENV === "production",
//     },
//     tableName: "session",
//     createTableIfMissing: true,
//   });

//   const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
//     admin,
//     {
//       authenticate,
//       cookieName: "adminjs",
//       cookiePassword: "sessionsecret",
//     },
//     null,
//     {
//       store: sessionStore,
//       resave: true,
//       saveUninitialized: true,
//       secret: "sessionsecret",
//       cookie: {
//         httpOnly: process.env.NODE_ENV === "production",
//         secure: process.env.NODE_ENV === "production",
//       },
//       name: "adminjs",
//     }
//   );
//   app.use(admin.options.rootPath, adminRouter);

//   app.listen(port, () => {
//     console.log(
//       `AdminJS started on http://localhost:${port}${admin.options.rootPath}`
//     );
//   });
// };
