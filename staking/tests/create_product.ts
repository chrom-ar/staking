import {
  CustomAbortController,
  getPortNumber,
  standardSetup,
} from "./utils/before";
import path from "path";
import { PublicKey } from "@solana/web3.js";
import { StakeConnection } from "../app";
import { BN, Program, utils } from "@coral-xyz/anchor";
import * as wasm from "@pythnetwork/staking-wasm";
import assert from "assert";
import { Staking } from "../target/types/staking";
import { abortUnlessDetached } from "./utils/after";

const portNumber = getPortNumber(path.basename(__filename));

describe("create_product", async () => {
  let stakeConnection: StakeConnection;
  let controller: CustomAbortController;
  let program: Program<Staking>;
  let targetAccount: PublicKey;
  let bump: number;

  before(async () => {
    console.log('create_product.ts:24');
    ({ controller, stakeConnection } = await standardSetup(portNumber));
    console.log('create_product.ts:26');

    program = stakeConnection.program;
    console.log('create_product.ts:29');
  });

  it("checks governance product", async () => {
    console.log('create_product.ts:30');
    [targetAccount, bump] = await PublicKey.findProgramAddress(
      [
        utils.bytes.utf8.encode(wasm.Constants.TARGET_SEED()),
        utils.bytes.utf8.encode(wasm.Constants.VOTING_TARGET_SEED()),
      ],
      program.programId
    );

    console.log('create_product.ts:39');
    const productAccountData = await program.account.targetMetadata.fetch(
      targetAccount
    );
    console.log('create_product.ts:43');

    assert.equal(
      JSON.stringify(productAccountData),
      JSON.stringify({
        bump,
        lastUpdateAt: (await stakeConnection.getTime()).div(
          stakeConnection.config.epochDuration
        ),
        prevEpochLocked: new BN(0),
        locked: new BN(0),
        deltaLocked: new BN(0),
      })
    );
    console.log('create_product.ts:57');
  });

  after(async () => {
    await abortUnlessDetached(portNumber, controller);
  });
});
