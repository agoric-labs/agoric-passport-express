import express from 'express';
import { agoricWalletLink } from '../agoric';

const router = express.Router();

router.get('/challenge', agoricWalletLink.getChallenge);

router.post('/signed-challenge', agoricWalletLink.submitSignedChallenge);

export default router;
