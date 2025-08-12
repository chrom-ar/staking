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
    connection,
    config,
    program,
    pythMintAccount,
    governanceProgram,
  } = full();

  let data = await connection.getAccountInfo(new PublicKey("HpcaNLxqb2UTYJsdedYDv5MicJcxfW4ZZ1JJj9J3Qrab"))

  console.log(data)

}

main()
