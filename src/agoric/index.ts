import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { parseVstorage } from './vstorage';
import { verifyADR36Amino } from '@keplr-wallet/cosmos';

type Purse = {
  brand?: string;
  petname?: string;
  balance: { brand: string; value: unknown };
  displayInfo: unknown;
};

export type AgoricRequest = Request & {
  agoricPurses?: Purse[];
};

const randomString = (size = 21) =>
  randomBytes(size).toString('base64').slice(0, size);

export const agoricWalletLink = (() => {
  const getChallenge = async (req: Request, res: Response) => {
    if (!req.user) {
      res.redirect('/auth/login');
    }
    req.user!.walletChallenge = randomString();
    await req.user!.save();

    res.locals.user = req.user;
    res.render('agoric', { user: req.user });
  };

  const submitSignedChallenge = async (req: Request, res: Response) => {
    console.log('got request', req.body);
    const challenge = req.user?.walletChallenge;
    if (challenge === undefined) {
      res
        .status(400)
        .send('No challenge registered on backend for this account');
      return;
    }

    const {
      address,
      signedChallenge: { pub_key: pubKey, signature },
    } = req.body;
    const verified = verifyADR36Amino(
      'agoric',
      address,
      JSON.stringify({ username: req.user!.username, challenge }),
      Buffer.from(pubKey.value, 'base64'),
      Buffer.from(signature, 'base64')
    );
    if (verified) {
      req.user!.walletAddress = address;
      await req.user!.save();
      res.status(200).send(`Wallet successfully verified: ${address}`);
      return;
    }
    res.status(400).send('Invalid signature, wallet could not be verified');
  };

  return { getChallenge, submitSignedChallenge };
})();

export const agoricWalletPurses =
  (apiAddr: string) =>
  (req: AgoricRequest, _res: Response, next: NextFunction) => {
    const address = req.user?.walletAddress;
    if (!address) {
      next();
      return;
    }

    const fetchBankPurses = async () => {
      const bankUrl = `${apiAddr}/cosmos/bank/v1beta1/balances/${address}`;
      const displayInfoUrl = `${apiAddr}/agoric/vstorage/data/published.agoricNames.vbankAsset`;

      const [bank, assetInfoRes] = await Promise.all([
        fetch(bankUrl).then(res => res.json()),
        fetch(displayInfoUrl).then(res => res.json()),
      ]);
      const assetInfo = parseVstorage(assetInfoRes);
      const bankMap = new Map<string, string>(
        bank.balances.map(
          ({ denom, amount }: { denom: string; amount: string }) => [
            denom,
            amount,
          ]
        )
      );

      const brandToPurse = new Map<string, Purse>();

      assetInfo.forEach(([denom, info]: [string, any]) => {
        const amount = bankMap.get(denom) ?? BigInt(0);
        const purseInfo: Purse = {
          brand: info.brand,
          balance: { brand: info.brand, value: BigInt(amount) },
          petname: info.issuerName,
          displayInfo: info.displayInfo,
        };
        brandToPurse.set(info.brand, purseInfo);
      });

      return brandToPurse;
    };

    const fetchWalletPurses = async () => {
      const queryBoardAux = async (boardId: string) => {
        const res = await fetch(
          `${apiAddr}/agoric/vstorage/data/published.boardAux.${boardId}`
        ).then(res => res.json());

        return parseVstorage(res);
      };

      const walletP = fetch(
        `${apiAddr}/agoric/vstorage/data/published.wallet.${address}.current`
      )
        .then(res => res.json())
        .then(parseVstorage);
      const brandNamesP = fetch(
        `${apiAddr}/agoric/vstorage/data/published.agoricNames.brand`
      )
        .then(res => res.json())
        .then(parseVstorage);
      const [wallet, brandNames] = await Promise.all([walletP, brandNamesP]);

      const brands = wallet.purses.map((p: { brand: string }) => p.brand);

      const boardAux = await Promise.all(brands.map(queryBoardAux));
      const brandToBoardAux = new Map(
        brands.map((brand: string, index: number) => [brand, boardAux[index]])
      );

      const brandToPurse = new Map<string, Purse>();

      wallet.purses.forEach(
        ({ balance, brand }: { balance: any; brand: string }) => {
          const petname = brandNames
            .find(([_petname, b]: [string, string]) => b === brand)
            ?.at(0);
          const displayInfo = brandToBoardAux.get(brand) ?? {};
          const purse: Purse = {
            brand,
            balance,
            petname,
            displayInfo,
          };
          brandToPurse.set(brand, purse);
        }
      );

      return brandToPurse;
    };

    const fetchAllPurses = async () => {
      const [bankPurses, walletPurses] = await Promise.all([
        fetchBankPurses(),
        fetchWalletPurses(),
      ]);
      return [...new Map([...bankPurses, ...walletPurses]).values()];
    };

    fetchAllPurses()
      .then(purses => {
        console.log('got purses', purses);
        req.agoricPurses = purses;
      })
      .finally(() => next());
  };
