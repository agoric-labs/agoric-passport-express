import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { parseVstorage } from './vstorage';

type Purse = {
  brand?: string;
  petname?: string;
  balance: unknown;
  displayInfo: unknown;
};

export type AgoricRequest = Request & {
  agoricPurses?: Purse[];
};

const randomString = (size = 21) =>
  randomBytes(size).toString('base64').slice(0, size);

export const agoricWalletLink = (() => {
  const getChallenge = (req: Request, res: Response) => {
    if (!req.user) {
      res.redirect('/auth/login');
    }
    req.user!.walletChallenge = randomString();
    req.user!.save().then(user => res.send(user.walletChallenge));
  };

  const submitSignedChallenge = (req: Request, res: Response) => {
    /**
     * TODO
     *
     * Example here
     * https://github.com/agoric-labs/dapp-game-places/pull/2/files#diff-dda050138732cca1a2c02c31a29e0301bc179de5769ea6475d9eb9a154dfc243
     *
     * The above example will need to be split up so that `signArbitrary`
     * happens in the UI after it walls GET /wallet-link/challenge, then it
     * calls POST /wallet-link/signed-challenge with the signed challenge.
     * Then, in this handler, call `verifyArbitrary` as seen in the example and
     * save req.user.walletAddress if verification is successfull.
     *
     * */
  };

  return { getChallenge, submitSignedChallenge };
})();

export const agoricWalletPurses =
  (apiAddr: string) =>
  (req: AgoricRequest, _res: Response, next: NextFunction) => {
    const address = req.user?.walletAddress;
    if (!address) {
      console.log('empty address', address);
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
