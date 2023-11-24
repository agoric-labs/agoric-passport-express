import express from 'express';
import mongoose from 'mongoose';
import { COOKIE_KEY, MONGO_URI, PORT } from './utils/secrets';
import authRoutes from './routes/authRoutes';
import profileRoutes from './routes/profileRoutes';
import walletLinkRoutes from './routes/walletLinkRoutes';
import './config/passport';
import cookieSession from 'cookie-session';
import passport from 'passport';
import { AgoricRequest, agoricWalletPurses } from './agoric';

const app = express();

app.set('view engine', 'ejs');

app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [COOKIE_KEY],
  })
);

app.use(express.json());
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(MONGO_URI, () => {
  console.log('connected to mongodb');
});

app.use(agoricWalletPurses('https://emerynet.api.agoric.net:443'));
app.use('/wallet-link', walletLinkRoutes);
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

app.get('/', (req, res) => {
  res.render('home', { user: req.user });
});

app.get('/token-gated', (req: AgoricRequest, res) => {
  console.log('User purses:', req.agoricPurses);
  if (!req.agoricPurses) {
    res
      .status(400)
      .send(
        'Permission Denied: Link your wallet before accessing exclusive content.'
      );
    return;
  }
  const minimum = 10_000_000n;
  const insufficientBalance = (balance: BigInt) => {
    res
      .status(400)
      .send(
        `Permission Denied: You need ${minimum} uIST to view this content. You only have ${balance}.`
      );
  };

  const istPurse = req.agoricPurses?.find(({ petname }) => petname === 'IST');
  if (!istPurse) {
    return insufficientBalance(0n);
  }

  const istAmount = istPurse.balance.value;
  if ((istAmount as bigint) < minimum) {
    return insufficientBalance(istAmount as BigInt);
  }
  res.send(
    'Congrats! You have enough IST to access exclusive content (っ◕‿◕)っ'
  );
});

app.listen(PORT, () => {
  console.log('App listening on port: ' + PORT);
});
