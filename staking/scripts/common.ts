import { AnchorProvider, Program, utils, Wallet } from "@coral-xyz/anchor";
import { StakeConnection } from "../app";
import { Connection, clusterApiUrl, PublicKey, Keypair, TransactionInstruction } from "@solana/web3.js";
import {
  readAnchorConfig,
  requestPythAirdrop,
  ANCHOR_CONFIG_PATH,
} from "../tests/utils/before";
import * as fs from "node:fs";
import * as IDL from "../target/idl/staking.json";
import { Staking } from "../target/types/staking";
import * as IntegrityIDL from "../target/idl/integrity_pool.json";
import { IntegrityPool } from "../target/types/integrity_pool";

export const deployData = JSON.parse(fs.readFileSync("./deploy-data.json").toString());

let tmpPubData = {}
try {
  tmpPubData = JSON.parse(fs.readFileSync("./publisher-data.json").toString());
} catch (e) {
};

export const publisherData = tmpPubData;

export const saveDeployData = (data: any) => {
  fs.writeFileSync("./deploy-data.json", JSON.stringify(data, null, 2));
}

export const full = () => {
  const config = readAnchorConfig(ANCHOR_CONFIG_PATH);
  const pythMintAccount = new PublicKey(deployData.mintToken);
  const authority = Keypair.fromSecretKey(new Uint8Array(
    JSON.parse(
      fs.readFileSync(`/home/rotsen/.config/solana/id.json`).toString()
    ) // ['_keypair']['secretKey'])
  ))
  const publisher = Keypair.fromSecretKey(new Uint8Array(
    JSON.parse(
      fs.readFileSync(`./publisher.json`).toString()
    ) // ['_keypair']['secretKey'])
  ))


  let url

  if (!process.env.network || process.env.network == 'local') {
      url = "http://localhost:8899"
  } else {
      url = clusterApiUrl(process.env.network as any)
  }

  const connection = new Connection(url, 'confirmed')
  const provider = new AnchorProvider(connection, new Wallet(authority), {})
  const program = new Program<Staking>(IDL as Staking, provider);
  // const pdaAuthorityKeypair = new Keypair();
  // const pdaAuthority = pdaAuthorityKeypair.publicKey;
  const governanceProgram = new PublicKey(config.programs.devnet.governance);

  const integrityProgram = new Program<IntegrityPool>(IntegrityIDL as IntegrityPool, provider);

  const pubProvider = new AnchorProvider(connection, new Wallet(publisher), {})
  const pubProgram = new Program<Staking>(IDL as Staking, pubProvider);
  const pubIntegrityProgram = new Program<IntegrityPool>(IntegrityIDL as IntegrityPool, pubProvider);


  return {
    pubIntegrityProgram,
    pubProgram,
    pubProvider,
    integrityProgram,
    config,
    pythMintAccount,
    authority,
    url,
    connection,
    provider,
    program,
    governanceProgram,
    publisher,
  };
}

export const getStakeConnection = async (connection, program, config) => {
  return await StakeConnection.createStakeConnection(
    connection,
    (program.provider as AnchorProvider).wallet as Wallet,
    new PublicKey(config.programs.devnet.staking)
  );
}
