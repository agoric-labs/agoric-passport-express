import passport from 'passport';
import passportGoogle from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import User from '../models/User';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../utils/secrets';
import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from '../utils/secrets';
const GoogleStrategy = passportGoogle.Strategy;

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/redirect',
    },
    async (accessToken, refreshToken, profile, done) => {
      const user = await User.findOne({ googleId: profile.id });

      // If user doesn't exist creates a new user. (similar to sign up)
      if (!user) {
        const newUser = await User.create({
          provider: 'google',
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails?.[0].value,
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

passport.use(
  new DiscordStrategy(
    {
      clientID: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      callbackURL: '/auth/discord/redirect',
      scope: ['identify', 'guilds'],
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log('discord profile', profile);

      const user = await User.findOne({ discordeId: profile.id });

      // If user doesn't exist creates a new user. (similar to sign up)
      if (!user) {
        const newUser = await User.create({
          provider: 'discord',
          discordeId: profile.id,
          avatar: profile.avatar,
          username: profile.username,
          fetchedAt: profile.fetchedAt,
        });
        console.log('@@@', { newUser });
        if (newUser) {
          done(null, newUser);
        }
      } else {
        done(null, user);
      }
    }
  )
);
