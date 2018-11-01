import fs from "fs";
import Koa from "koa";
import bodyParser from "koa-bodyparser";

import { MultiChainSigner } from "@iov/core";

import { chainConnector, codecFromString, codecImplementation } from "../../codec";
import * as constants from "../../constants";
import { logAccountsState, logSendJob } from "../../debugging";
import {
  accountsOfFirstChain,
  identitiesOfFirstChain,
  refillFirstChain,
  SendJob,
  sendOnFirstChain,
  tokenTickersOfFirstChain,
} from "../../multichainhelpers";
import { loadProfile } from "../../profile";
import { HttpError } from "./httperror";
import { RequestParser } from "./requestparser";

let count = 0;

/** returns an integer >= 0 that increments and is unique in module scope */
function getCount(): number {
  return count++;
}

export async function start(args: ReadonlyArray<string>): Promise<void> {
  if (args.length < 4) {
    throw Error(`Not enough arguments for action 'start'. See README for arguments`);
  }
  const filename = args[0];
  const password = args[1];
  const codec = codecFromString(args[2]);
  const blockchainBaseUrl: string = args[3];

  const port = constants.port;

  if (!fs.existsSync(filename)) {
    throw Error("File does not exist on disk, did you mean to -init- your profile?");
  }
  const profile = await loadProfile(filename, password);
  const signer = new MultiChainSigner(profile);

  console.log("Connecting to blockchain ...");
  const connection = (await signer.addChain(chainConnector(codec, blockchainBaseUrl))).connection;

  const connectedChainId = connection.chainId();
  console.log(`Connected to network: ${connectedChainId}`);

  const accounts = await accountsOfFirstChain(signer);
  logAccountsState(accounts);
  const holderAccount = accounts[0];

  const chainTokens = await tokenTickersOfFirstChain(signer);
  console.log("Chain tokens:", chainTokens);

  // TODO: availableTokens value is never updated during runtime of the server
  const availableTokens = holderAccount.balance.map(coin => coin.tokenTicker);
  console.log("Available tokens:", availableTokens);

  const distibutorIdentities = identitiesOfFirstChain(signer).slice(1);

  await refillFirstChain(signer);

  console.log("Creating webserver ...");
  const api = new Koa();
  api.use(bodyParser());

  api.use(async context => {
    switch (context.path) {
      case "/status":
        const updatedAccounts = await accountsOfFirstChain(signer);
        // tslint:disable-next-line:no-object-mutation
        context.response.body = {
          status: "ok",
          nodeUrl: blockchainBaseUrl,
          chainId: connectedChainId,
          chainTokens: chainTokens,
          availableTokens: availableTokens,
          holder: updatedAccounts[0],
          distributors: updatedAccounts.slice(1),
        };
        break;
      case "/credit":
        if (context.request.method !== "POST") {
          throw new HttpError(405, "This endpoint requires a POST request");
        }

        if (context.request.type !== "application/json") {
          throw new HttpError(415, "Content-type application/json expected");
        }

        const { address, ticker } = RequestParser.parseCreditBody(context.request.body);

        if (!codecImplementation(codec).isValidAddress(address)) {
          throw new HttpError(400, "Address is not in the expected format for this chain.");
        }

        if (availableTokens.indexOf(ticker) === -1) {
          const tokens = JSON.stringify(availableTokens);
          throw new HttpError(422, `Token is not available. Available tokens are: ${tokens}`);
        }

        const sender = distibutorIdentities[getCount() % distibutorIdentities.length];

        try {
          const job: SendJob = {
            sender: sender,
            recipient: address,
            amount: 1,
            tokenTicker: ticker,
          };
          logSendJob(signer, job);
          await sendOnFirstChain(signer, job);
        } catch (e) {
          console.log(e);
          throw new HttpError(500, "Sending tokens failed");
        }

        // tslint:disable-next-line:no-object-mutation
        context.response.body = "ok";
        break;
      default:
      // koa sends 404 by default
    }
  });
  console.log(`Started webserver on port ${port}`);
  api.listen(port);
}
