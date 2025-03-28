import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { Transaction, SystemProgram, Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import { Token } from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import * as wasm from "@pythnetwork/staking-wasm";
import fs from "fs";

import { deployData, full, saveDeployData } from "./common";

const main = async () => {
  const {
    config,
    pythMintAccount,
    authority,
    url,
    connection,
    provider,
    program,
    governanceProgram,
    integrityProgram,
  } = full();


  const configAccount = new PublicKey(deployData.configAccount);
  const poolData = new PublicKey(deployData.poolData);
  const [poolConfig, _bump] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode("pool_config")],
    integrityProgram.programId
  );

 const slashCustody = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    pythMintAccount,
    authority.publicKey,
    true
  );

  if ((await connection.getAccountInfo(slashCustody)) == null) {
    const createAtaIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      pythMintAccount,
      slashCustody,
      authority.publicKey,
      authority.publicKey
    );
    const transaction = new Transaction();
    transaction.add(createAtaIx);
    await provider.sendAndConfirm(transaction, [authority]);
  }

  deployData.poolConfig = poolConfig.toBase58();
  deployData.slashCustody = slashCustody.toBase58();

  console.log("Initializing with: ", {
    payer: authority.publicKey,
    configAccount,
    poolData,
    poolConfig,
    slashCustody
  })

  console.log("Initializing pool",
    await integrityProgram.methods.initializePool(
      authority.publicKey,
      new BN(0)
    ).accounts({
      payer: authority.publicKey,
      configAccount,
      poolData,
      poolConfig,
      slashCustody
    }).signers([authority]).rpc({
      skipPreflight: true,
      commitment: 'confirmed'
    })
  );

  saveDeployData(deployData);
};

main().catch(console.error);
