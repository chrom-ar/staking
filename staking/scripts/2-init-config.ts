import { utils } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as wasm from "@pythnetwork/staking-wasm";
import {
  readAnchorConfig,
  requestPythAirdrop,
  ANCHOR_CONFIG_PATH,
} from "../tests/utils/before";

import { deployData, saveDeployData, full } from "./common";


const main = async () => {
  const {
    provider,
    config,
    program,
    pythMintAccount,
    governanceProgram,
  } = full();

  let configAccount: PublicKey;
  let bump: number;

  [configAccount, bump] = await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(wasm.Constants.CONFIG_SEED())],
    program.programId
  );

  console.log("Config Acc: ", configAccount);
  deployData.configAccount = configAccount.toBase58();

  saveDeployData(deployData);

  await program.methods
    .initConfig({
      bump,
      governanceAuthority: program.provider.publicKey,
      pythTokenMint: pythMintAccount,
      removedUnlockingDuration: 0,
      epochDuration: new BN(60), // new BN(3600 * 24 * 2), // 2 days to test
      freeze: false,
      pdaAuthority: program.provider.publicKey,
      governanceProgram,
      pythTokenListTime: null,
      agreementHash: Array.from({ length: 32 }, (_, i) => i), // replace with real
      // mockClockTime: new BN(10),
      poolAuthority: program.provider.publicKey, // migrate to integrity pool
    })
    .rpc();

  await program.methods.createTarget().rpc();

  const configAccountData = await program.account.globalConfig.fetch(
    configAccount
  );

  console.log(configAccountData);
};

main();
