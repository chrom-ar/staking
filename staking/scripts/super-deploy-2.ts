import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import * as wasm from "@pythnetwork/staking-wasm";
import { PythBalance } from "../app";
import { Staking } from "../target/types/staking";
import * as IDL from "../target/idl/staking.json";
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
  // const pdaAuthorityKeypair = new Keypair();
  // const pdaAuthority = pdaAuthorityKeypair.publicKey;
  const governanceProgram = new PublicKey(config.programs.localnet.governance);
  // const poolAuthority = PublicKey.unique();

  let configAccount: PublicKey;
  let bump: number;

  [configAccount, bump] = await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(wasm.Constants.CONFIG_SEED())],
    program.programId
  );

  console.log("Config Acc: ", configAccount);

  // await program.methods
  //   .initConfig({
  //     bump,
  //     governanceAuthority: program.provider.publicKey,
  //     pythTokenMint: pythMintAccount,
  //     removedUnlockingDuration: 0,
  //     epochDuration: new BN(3600 * 24 * 2), // 2 days to test
  //     freeze: false,
  //     pdaAuthority: program.provider.publicKey,
  //     governanceProgram: governanceProgram,
  //     pythTokenListTime: null,
  //     agreementHash: Array.from({ length: 32 }, (_, i) => i), // replace with real
  //     // mockClockTime: new BN(10),
  //     poolAuthority: program.provider.publicKey, // migrate to integrity pool
  //   })
  //   .rpc();

  // await program.methods.createTarget().rpc();

  // await requestPythAirdrop(
  //   program.provider.publicKey!,
  //   pythMintAccount,
  //   authority,
  //   PythBalance.fromString("100"),
  //   program.provider.connection
  // );

  const configAccountData = await program.account.globalConfig.fetch(
    configAccount
  );

  console.log(configAccountData);
};

main();

