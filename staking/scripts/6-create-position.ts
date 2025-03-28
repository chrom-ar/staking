import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { Transaction, SystemProgram, Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import { Token } from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { PositionAccountJs } from "../app/PositionAccountJs";
import * as wasm from "@pythnetwork/staking-wasm";
import fs from "fs";

import { publisherData, deployData, full, saveDeployData, getStakeConnection } from "./common";

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
    publisher,
    pubIntegrityProgram,
  } = full();


  const configAccount = new PublicKey(deployData.configAccount);
  const poolData = new PublicKey(deployData.poolData);


  const stakeConnection = await getStakeConnection(connection, program, config);
  // console.log("StakeConnection:", stakeConnection);
  console.log("Stake: ", publisherData.stakeAccountPositions);
  let stakeAcc = await stakeConnection.loadStakeAccount(new PublicKey(publisherData.stakeAccountPositions));
  console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));


  const inbuf = await program.provider.connection.getAccountInfo(
    new PublicKey(publisherData.stakeAccountPositions)
  );
  const positionAccount = new PositionAccountJs(inbuf.data, program.idl);
  for (let index = 0; index < positionAccount.positions.length; index++) {
    console.log("Index: ", index, "Position:", positionAccount.positions[index]);
    // assert.equal(positionAccount.positions[index], null);
  }


  // Must be done by the pool authority
  await program.methods.updatePoolAuthority(
    new PublicKey(deployData.poolConfig)
  ).rpc();

  const createPosIx = await pubIntegrityProgram.methods
  .delegate(new BN(100_000_000))
  .accounts({
    owner: publisher.publicKey,
    publisher: publisher.publicKey,
    poolData: deployData.poolData,
    poolConfig: deployData.poolConfig,
    configAccount: deployData.configAccount,
    stakeAccountPositions:  publisherData.stakeAccountPositions,
    stakeAccountMetadata: publisherData.stakeAccountMetadata,
    stakeAccountCustody: publisherData.stakeAccountCustody,
    stakingProgram: config.programs.devnet.staking,
  })
  .rpc()


  // const createPosIx = await pubIntegrityProgram.methods
  // .undelegate(0, new BN(10))
  // .accounts({
  //   owner: publisher.publicKey,
  //   publisher: publisher.publicKey,
  //   poolData: deployData.poolData,
  //   poolConfig: deployData.poolConfig,
  //   configAccount: deployData.configAccount,
  //   stakeAccountPositions:  deployData.stakeAccountPositions,
  //   stakeAccountMetadata: deployData.stakeAccountMetadata,
  //   stakeAccountCustody: deployData.stakeAccountCustody,
  //   // config: deployData.configAccount,
  //   stakingProgram: config.programs.devnet.staking,
  // })
  // .rpc()


    // let transaction = new Transaction();
    // transaction.add(createPosIx);


  // await pubProvider.sendAndConfirm(transaction, [], {});

  // console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));
  await new Promise(r => setTimeout(r, 1000));
  console.log("Stake: ", publisherData.stakeAccountPositions);
  stakeAcc = await stakeConnection.loadStakeAccount(new PublicKey(publisherData.stakeAccountPositions));
  console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));



  // saveDeployData(deployData);
};

main().catch(console.error);
