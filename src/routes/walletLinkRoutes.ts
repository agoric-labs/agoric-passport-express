import express from 'express';
import { agoricWalletLink } from '../agoric';

const router = express.Router();

router.get('/', agoricWalletLink.getChallenge);

router.post('/signed-challenge', agoricWalletLink.submitSignedChallenge);

export default router;
