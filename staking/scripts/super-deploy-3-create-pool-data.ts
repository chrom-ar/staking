import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { Transaction, SystemProgram, Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import * as wasm from "@pythnetwork/staking-wasm";
import { PythBalance } from "../app";
import { Staking } from "../target/types/staking";
import * as IDL from "../target/idl/staking.json";
import { IntegrityPool } from "../target/types/integrity_pool";
import * as IntegrityIDL from "../target/idl/integrity_pool.json";
import {
  readAnchorConfig,
  requestPythAirdrop,
  ANCHOR_CONFIG_PATH,
} from "../tests/utils/before";
import fs from "fs";

const main = async () => {
  const config = readAnchorConfig(ANCHOR_CONFIG_PATH);
  const pythMintAccount = new PublicKey(config.programs.devnet.mint);
  const authority = Keypair.fromSecretKey(new Uint8Array(
    JSON.parse(
      fs.readFileSync(`/home/rotsen/.config/solana/id.json`).toString()
    ) // ['_keypair']['secretKey'])
  ))

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const provider = new AnchorProvider(connection, new Wallet(authority), {})

  const program = new Program<Staking>(IDL as Staking, provider);
  const integrityProgram = new Program<IntegrityPool>(IntegrityIDL as IntegrityPool, provider);
  // const pdaAuthorityKeypair = new Keypair();
  // const pdaAuthority = pdaAuthorityKeypair.publicKey;
  const governanceProgram = new PublicKey(config.programs.localnet.governance);
  // const poolAuthority = PublicKey.unique();

  // let publisher_keypair = Keypair::new();
  let pool_data_keypair = new Keypair();
  // let reward_program_authority = Keypair::new();

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


  // initialize pool reward custody
};

main();
