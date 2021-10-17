0. Install typescript
   `npm install -D typescript @types/node ts-node nodemon`
1. `npm init -y`
2. `tsc --init`
3. git init
4. add .gitignore (remove blog.md)
5. edit `tsconfig.json`
   ```json
   "outDir": "./dist",
   "rootDir": "./src"
   ```
6. Create `index.ts` in src folder
7. Note: npm install --save-dev ts-node nodemon ( Because ts-node is installed you can directily use `nodemon index.ts`)
   Source: https://stackoverflow.com/questions/37979489/how-to-watch-and-reload-ts-node-when-typescript-files-change
8. Add these scripts in `package.json`

   ```json
   "start": "node dist/app.js",
   "dev": "nodemon src/app.ts",
   "build": "tsc -p ."
   ```

9. Install required packages
   `npm i express mongoose passport passport-google-oauth20`

10. Install type definition files for some packages as devdependencies
    npm i -D @types/express @types/passport @types/passport-google-oauth20

Create an express server

```ts
import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("App listening on port: " + PORT);
});
```

Now setup our database connection, before that lets setup a file to store
confidential credentials like the database URI. For that we will have to install a package
`npm install dotenv`

Now create a .env file in the root of the project and add your database uri, like this
`dbURL = mongodb://localhost:27017/PROJECT_NAME`

Now we need to create a layer between our app and the .env file to check if the env variables are available and valid.
create a secrets.ts file in `utils` folder inside the src folder (ie where your app.ts exist)

```ts
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else {
  console.error(".env file not found.");
}

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

export const MONGO_URI = prod
  ? (process.env.MONGO_PROD as string)
  : (process.env.MONGO_LOCAL as string);

if (!MONGO_URI) {
  if (prod) {
    console.error(
      "No mongo connection string. Set MONGO_PROD environment variable."
    );
  } else {
    console.error(
      "No mongo connection string. Set MONGO_LOCAL environment variable."
    );
  }
  process.exit(1);
}
```

Lets now setup up `ejs` which will help us render html to the client
`npm i ejs`

In your app.ts

```ts
app.set("view engine", "ejs");
```

This will setup a view engine which will look for a views folder in root of the project for ejs templates.
so create a folder views and create a home.ejs file in it. We can write a simple html code in it.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Oauth App</title>
  </head>

  <body>
    <h1>This is home</h1>
  </body>
</html>
```

now lets setup the home route, to see if our view engine works

```ts
app.get("/", (req, res) => {
  res.render("home");
});
```

Next up, to setup our authentication routes lets create a folder `routes` inside src folder
add a file `authRoutes.ts`

```ts
import express from "express";
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login");
});

export default router;
```

Now in app.ts, import and use the authRoutes, your app.ts should look sth like this

```ts
import express from "express";
import mongoose from "mongoose";
import { MONGO_URI } from "./utils/secrets";
import authRoutes from "./routes/authRoutes";

const app = express();

app.set("view engine", "ejs");

mongoose.connect(MONGO_URI, () => {
  console.log("connected to mongodb");
});

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.render("home");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("App listening on port: " + PORT);
});
```

Now create a file `login.ejs` inside views folder

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Login</title>
  </head>

  <body>
    <a href="/">Homepage</a>
    <h3>Login to Continue</h3>
    <a href="/auth/google">Login with Google</a>
  </body>
</html>
```

Now lets setup passport.js for handling oauth. Passport.js provides many startegies that allows us to authenticate users through different mediums like google,facebook,github etc. Here, we will be using google Oauth 2.0

But before all that, we need to setup our project in the google developer console https://console.cloud.google.com/apis/dashboard

you will see a dashboard, create a new project

At the top you will see a button named `Enable APIs & Services`, click it and scroll down and choose Google+ API and click "enable"
Once its enabled, navigate back to your project dashboard (navigation bar in your top left corner, APIs & Service > Dashboard)

Lets setup the consent screen first.
click on the `OAuth consent screen` tab

You will be asked to choose the user type, choose `External` and hit `Create`

Under App Information add your app name, user support email and app logo(which is optional, you can totally skip it)

Under App domain, add application homepage ( it can be http://localhost:3000 for now, later you can change it if you deploy it anywhere)
Leave everything else and
Now move on to Developer contact informaton, add your email address then save and continue

You will be redirected to scopes page, click on `Add or Remove Scopes`
and check the first two(ie. userinfo.email & userinfo.profile)
scope means what data do we want to access fromt he user's google account. Here we want just the email and profile, if you need more or less data check the boxes accordingly.

We are done here, now save and continue. check all the details in the summary, if they are as you've entered them, then click on `back to dashboard`

Go to credentials tab, and at the top click on create credentials and choose the `OAuth Client ID` option

Choose the application type to be `Web Application`
Give it a name
In authorized javascript origin, use the current url of YOUR application ( in my case its http://localhost:3000)

In authorized redirect URI, put http://localhost:3000/auth/google/redirect
make sure the route is precisely "/auth/google/redirect" because we will setup our routes accordingly
and now hit create

you will be provided with `client ID` and `client Secret` copy those into your .env as

```
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
```

now in your secret.ts lets export these credentials as

```ts
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
```

Now that we have our credentials, we can start setting up passportjs strategy in our app.
Create a `config` folder inside src and create a file `passport.ts` inside it.

// TODO: incomplete

```ts
// TODO: incomplete
import passport from "passport";
import passportGoogle from "passport-google-oauth20";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../utils/secrets";
const GoogleStrategy = passportGoogle.Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/redirect",
    },
    (accessToken, refreshToken, profile, done) => {
      // get profile details
      // save profile details in db
    }
  )
);
```

Next, import the `passport.ts` in your `app.ts`;

```ts
import "./config/passport";
```

In `login.ejs`, you can see we had an anchor tag that links to the route `auth/google`, we will use this route to redirect user to the
google consent screen.
// TODO: add a consent screen screenshot

so now lets set up that route in `authRoutes.ts`
make sure you import passportjs in this file

```ts
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
  })
);
```

Now if you go to `http://localhost:3000/auth/login` and click on login with google, you will hit the route `auth/google` which will take you to the consent screen and if you try to login you will get an error
`Cannot GET /auth/google/redirect`

This is because we have not setup the callback route yet.

```ts
router.get("/google/redirect", passport.authenticate("google"), (req, res) => {
  res.send("This is the callback route");
});
```

This will get rid of the error but you might have noticed the consent screen is stuck, this is because the callback function in our passport.ts file is empty.

Inside this callback function we receive data from google about the user, so this is where we can store the user data in our database.

Lets build the user schema, create a folder "models" inside the src folder. Inside models folder create a file "User.ts" where we can define the schema as:

```ts
import mongoose, { Document } from "mongoose";

const Schema = mongoose.Schema;

export type UserDocument = Document & {
  username: string;
  email: string;
  googleId: string;
};

const userSchema = new Schema<UserDocument>({
  username: String,
  email: String,
  googleId: String,
});

const User = mongoose.model<UserDocument>("User", userSchema);

export default User;
```

Now lets complete our callback function in passport.ts
// TODO: elaborate more

```ts
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/redirect",
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = await User.findOne({ googleId: profile.id });

      // If user doesn't exist creates a new user. (similar to sign up)
      if (!user) {
        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails && profile.emails[0].value,
        });
        if (newUser) {
          done(null, newUser);
        }
      } else {
        done(null, user);
      }
    }
  )
);
```

Passport has a `serializeUser` method which receives data from the passport callback function i.e from `done(null,user)` and stores it in the session. Here we are storing only user.id which will help us
identify the user.

```ts
passport.serializeUser((user, done) => {
  done(null, user.id);
});
```

// Explain deserialize

```ts
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
```

Install cookie-session, use it in the app and initialize passport,
Before we use cookie-session lets setup secret key in our .env file

```
COOKIE_KEY = any_long_and_random_string
```

Then export it in secrets.ts

```ts
export const COOKIE_KEY = process.env.COOKIE_KEY as string;
```

Now your app.ts should look sth like this

```ts
import cookieSession from "cookie-session";
import passport from "passport";

app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [COOKIE_KEY],
  })
);

app.use(passport.initialize());
app.use(passport.session());
```

now your app.ts should look sth like

```ts
import express from "express";
import mongoose from "mongoose";
import { COOKIE_KEY, MONGO_URI } from "./utils/secrets";
import authRoutes from "./routes/authRoutes";
import "./config/passport";
import cookieSession from "cookie-session";
import passport from "passport";

const app = express();

app.set("view engine", "ejs");

app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [COOKIE_KEY],
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI, () => {
  console.log("connected to mongodb");
});

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.render("home");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("App listening on port: " + PORT);
});
```