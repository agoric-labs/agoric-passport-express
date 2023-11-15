import express from 'express';
import mongoose from 'mongoose';
import { COOKIE_KEY, MONGO_URI, PORT } from './utils/secrets';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import walletLinkRoutes from './routes/walletLinkRoutes';
import './config/passport';
import cookieSession from 'cookie-session';
import passport from 'passport';
import { agoricWalletPurses } from './agoric';

const app = express();

app.set('view engine', 'ejs');

app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [COOKIE_KEY],
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI, () => {
  console.log('connected to mongodb');
});

app.use(agoricWalletPurses('https://agoric.api.kjnodes.com:443'));
app.use('/wallet-link', walletLinkRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

app.get('/', (req, res) => {
  res.render('home', { user: req.user });
});

app.listen(PORT, () => {
  console.log('App listening on port: ' + PORT);
});
