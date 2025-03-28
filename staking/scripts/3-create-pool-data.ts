import { Program } from "@coral-xyz/anchor";
import { Transaction, SystemProgram, PublicKey, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import { IntegrityPool } from "../target/types/integrity_pool";
import * as IntegrityIDL from "../target/idl/integrity_pool.json";

import { deployData, saveDeployData, full } from "./common";

const main = async () => {
  const { config, pythMintAccount, authority, url, connection, provider, program, governanceProgram } = full();
  const integrityProgram = new Program<IntegrityPool>(IntegrityIDL as IntegrityPool, provider);
  let pool_data_keypair = new Keypair();

  // create pool data account
  // let pool_data_account = program.account.pool_data.createAccount(); // create pool data account
  const poolDataSize = 2 * 1024 * 1024; // 2MB
  // console.log('poolDataSize', integrityProgram.account.poolData);
  await provider.sendAndConfirm(
    new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: authority.publicKey,
        newAccountPubkey: pool_data_keypair.publicKey,
        space: poolDataSize,
        lamports: await connection.getMinimumBalanceForRentExemption(poolDataSize),
        programId: new PublicKey(config.programs.devnet.integrity_pool),
      })),
      [pool_data_keypair, authority],
  )

  deployData.poolData = pool_data_keypair.publicKey.toBase58();
  saveDeployData(deployData);

  // initialize pool reward custody

};

main();
