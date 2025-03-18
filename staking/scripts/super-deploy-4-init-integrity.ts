import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { Transaction, SystemProgram, Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import { Token } from "@solana/spl-token";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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


  const governanceProgram = new PublicKey(config.programs.localnet.governance);

  const configAccount = new PublicKey("C4FHCTRTux6rqaV3rk79VGD4xtTk3zGhVNRwXh5ZmQMX");
  const poolData = new PublicKey("8bGWCWfSaXez32mio4zjsSjHRbU6KJuexmhhHnZqjM5s");
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


  // initialize pool reward custody
};

main().catch(console.error);
