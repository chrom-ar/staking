import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";
import {
  TOKEN_PROGRAM_ID,
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { expectFail, getTargetAccount } from "./utils/utils";
import BN from "bn.js";
import assert from "assert";
import * as wasm from "@pythnetwork/staking-wasm";
import path from "path";
import {
  standardSetup,
  getPortNumber,
  CustomAbortController,
  getDummyAgreementHash,
} from "./utils/before";
import { StakeConnection, PythBalance } from "../app";
import { PositionAccountJs } from "../app/PositionAccountJs";
import { TargetWithParameters } from "../app/StakeConnection";
import { abortUnlessDetached } from "./utils/after";
import { splTokenProgram } from "@coral-xyz/spl-token";



const portNumber = getPortNumber(path.basename(__filename));

describe("staking", async () => {
  const stakeAccountPositionsSecret = new Keypair();
  const votingProduct: TargetWithParameters = { voting: {} };

  let program: Program<Staking>;
  let provider: anchor.AnchorProvider;
  let userAta: PublicKey;
  let controller: CustomAbortController;
  let stakeConnection: StakeConnection;
  let authorities: any;
  const tokenProgram = splTokenProgram({ programId: TOKEN_PROGRAM_ID, provider: provider });
  let stakeAcc: any;

  after(async () => {
    await abortUnlessDetached(portNumber, controller);
  });
  before(async () => {
    ({ controller, stakeConnection, authorities } = await standardSetup(portNumber));

    program  = stakeConnection.program;
    provider = stakeConnection.provider;
    userAta  = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      stakeConnection.config.pythTokenMint,
      provider.wallet.publicKey,
      true
    );
  });

  it("creates vested staking account", async () => {
    const owner = provider.wallet.publicKey;

    const [metadataAccount, metadataBump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode(
          wasm.Constants.STAKE_ACCOUNT_METADATA_SEED()
        ),
        stakeAccountPositionsSecret.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [custodyAccount, custodyBump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode(wasm.Constants.CUSTODY_SEED()),
        stakeAccountPositionsSecret.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [authorityAccount, authorityBump] =
      await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode(wasm.Constants.AUTHORITY_SEED()),
          stakeAccountPositionsSecret.publicKey.toBuffer(),
        ],
        program.programId
      );

    const [voterAccount, voterBump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode(wasm.Constants.VOTER_RECORD_SEED()),
        stakeAccountPositionsSecret.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .createStakeAccount(owner, { fullyVested: {} })
      .preInstructions([
        await program.account.positionData.createInstruction(
          stakeAccountPositionsSecret,
          wasm.Constants.POSITIONS_ACCOUNT_SIZE()
        ),
      ])
      .postInstructions([
        await program.methods
          .createVoterRecord()
          .accounts({
            stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
          })
          .instruction(),
      ])
      .accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
      })
      .signers([stakeAccountPositionsSecret])
      .rpc();

    const stake_account_metadata_data =
      await program.account.stakeAccountMetadataV2.fetch(metadataAccount);

    assert.equal(
      JSON.stringify(stake_account_metadata_data),
      JSON.stringify({
        metadataBump,
        custodyBump,
        authorityBump,
        voterBump,
        owner,
        lock: { fullyVested: {} },
        nextIndex: 0,
        deprecated: null,
        signedAgreementHash: null,
      })
    );
  });

  it("deposits tokens", async () => {
    const transaction = new Transaction();
    const from_account = userAta;
    try {
      stakeAcc = await stakeConnection.loadStakeAccount(stakeAccountPositionsSecret.publicKey);
      console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));

    } catch (error) {
      console.log('Error:', error);
    }


    const toAccount = (
      await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode(wasm.Constants.CUSTODY_SEED()),
          stakeAccountPositionsSecret.publicKey.toBuffer(),
        ],
        program.programId
      )
    )[0];

    const ix = Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      from_account,
      toAccount,
      provider.wallet.publicKey,
      [],
      101
    );
    transaction.add(ix);

    const tx = await provider.sendAndConfirm(transaction, [], {});

    // try {
    //   const userBalance = await tokenProgram.account.account.fetch(userAta);
    //   console.log('- After deposit:', userBalance.amount);
    // } catch (error) {
    //   console.log('Error fetching user balance:', error);
    // }
  });

  it("stakes before accepting LLC agreement", async () => {
    await expectFail(
      program.methods
        .createPosition(votingProduct, PythBalance.fromString("102").toBN())
        .accounts({
          stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
        }),
      "You need to be an LLC member to perform this action"
    );

    await expectFail(
      program.methods.updateVoterWeight({ castVote: {} }).accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
      }),
      "You need to be an LLC member to perform this action"
    );
  });

  it("accepts the LLC agreement", async () => {
    await expectFail(
      program.methods.joinDaoLlc(Array.from(new Uint8Array(32))).accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
      }),
      "Invalid LLC agreement"
    );

    await program.methods
      .joinDaoLlc(getDummyAgreementHash())
      .accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
      })
      .rpc();
  });

  it("withdraws tokens", async () => {
    const toAccount = userAta;
    try {
      stakeAcc = await stakeConnection.loadStakeAccount(stakeAccountPositionsSecret.publicKey);
      console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));

    } catch (error) {
      console.log('Error:', error);
    }
    await program.methods
      .withdrawStake(new BN(1))
      .accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
        destination: toAccount,
      })
      .rpc();
    // try {
    //   const userBalance = await tokenProgram.account.account.fetch(userAta);
    //   console.log('- After withdraw:', userBalance.amount);
    // } catch (error) {
    //   console.log('Error fetching user balance:', error);
    // }
  });

  it("parses positions", async () => {
    const inbuf = await program.provider.connection.getAccountInfo(
      stakeAccountPositionsSecret.publicKey
    );
    const positionAccount = new PositionAccountJs(inbuf.data, program.idl);
    for (let index = 0; index < positionAccount.positions.length; index++) {
      assert.equal(positionAccount.positions[index], null);
    }
  });

  it("creates a position that's too big", async () => {
    await expectFail(
      program.methods
        .createPosition(votingProduct, PythBalance.fromString("102").toBN())
        .accounts({
          stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
        }),
      "Too much exposure to governance"
    );
  });

  it("creates a position", async () => {
    
    await program.methods
      .createPosition(votingProduct, new BN(1))
      .accounts({
        stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
      })
      .rpc();
    try {
      stakeAcc = await stakeConnection.loadStakeAccount(stakeAccountPositionsSecret.publicKey);
      console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));

    } catch (error) {
      console.log('Error:', error);
    }
    // try {
    //   const userBalance = await tokenProgram.account.account.fetch(userAta);
    //   console.log('- After create position:', userBalance.amount);
    // } catch (error) {
    //   console.log('Error fetching user balance:', error);
    // }
  });

  it("validates position", async () => {
    const inbuf = await program.provider.connection.getAccountInfo(
      stakeAccountPositionsSecret.publicKey
    );
    const { positions }  = new PositionAccountJs(inbuf.data, program.idl);
    assert.equal(positions[0].amount, 1);
    // assert.equal(positions[0].activationEpoch, new BN(1));
    assert.equal(positions[0].unlockingStart, null);
    assert.equal(
      JSON.stringify(positions[0].targetWithParameters),
      JSON.stringify(votingProduct)
    )

    for (let index = 1; index < positions.length; index++) {
      assert.equal(positions[index], null);
    }
  });

  it("creates position with 0 principal", async () => {
    await expectFail(
      program.methods
        .createPosition(votingProduct, PythBalance.fromString("0").toBN())
        .accounts({
          stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
        }),
      "New position needs to have positive balance"
    );
  });

  it("close position with 0 principal", async () => {
    await expectFail(
      program.methods
        .closePosition(0, PythBalance.fromString("0").toBN(), votingProduct)
        .accounts({
          stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
        }),
      "Closing a position of 0 is not allowed"
    );
  });

  it("testeando", async () => {
    try {
      stakeAcc = await stakeConnection.loadStakeAccount(stakeAccountPositionsSecret.publicKey);
      console.log('- GetBalanceSummary:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));

    } catch (error) {
      console.log('Error:', error);
    }

    try {
      // const userBalance = await tokenProgram.account.account.fetch(userAta);

      stakeAcc = await stakeConnection.loadStakeAccount(userAta);
      console.log('- GetBalanceSummary ata:', await stakeAcc.getBalanceSummary(await stakeConnection!.getTime()));

    } catch (error) {
      console.log('Error fetching user balance:', error);
    }

    const toAccount = userAta;

    // Get custody account address (same as deposit test)
    const custodyAccount = (await PublicKey.findProgramAddress(
        [
            anchor.utils.bytes.utf8.encode(wasm.Constants.CUSTODY_SEED()),
            stakeAccountPositionsSecret.publicKey.toBuffer(),
        ],
        program.programId
    ))[0];
    const [metadataAccount, metadataBump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode(
          wasm.Constants.STAKE_ACCOUNT_METADATA_SEED()
        ),
        stakeAccountPositionsSecret.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [authorityAccount, authorityBump] =
      await PublicKey.findProgramAddress(
        [
          anchor.utils.bytes.utf8.encode(wasm.Constants.AUTHORITY_SEED()),
          stakeAccountPositionsSecret.publicKey.toBuffer(),
        ],
        program.programId
      );

    const [voterAccount, voterBump] = await PublicKey.findProgramAddress(
      [
        anchor.utils.bytes.utf8.encode(wasm.Constants.VOTER_RECORD_SEED()),
        stakeAccountPositionsSecret.publicKey.toBuffer(),
      ],
      program.programId
    );


    console.log('Initial Balances:');
    // Get initial balances
    try {
      const userBalance = await tokenProgram.account.account.fetch(userAta);
      console.log('- User ATA:', userBalance.amount);
    } catch (error) {
      console.log('Error fetching user balance:', error);
    }
    try {
      const custodyBalance = await tokenProgram.account.account.fetch(custodyAccount);
      console.log('- Custody Account:', custodyBalance.amount);
    } catch (error) {
      console.log('Error fetching custody balance:', error);
    }
    try {
      const stakeAccountMetadata = await program.account.stakeAccountMetadataV2.fetch(metadataAccount);
      console.log('- Stake Account Lock:', stakeAccountMetadata.lock);
    } catch (error) {
      console.log('Error fetching stake account metadata:', error);
    }

    // get balance of pyth mint tokens
    try {
      const pythMintBalance = await tokenProgram.account.account.fetch(authorities.pythMintAuthority.publicKey);
      console.log('- Pyth Mint Balance:', pythMintBalance.amount);
    } catch (error) {
      console.log('Error fetching pyth mint balance:', error);
    }

    // Execute withdrawal
    // await program.methods
    //     .withdrawStake(new BN(1))
    //     .accounts({
    //         stakeAccountPositions: stakeAccountPositionsSecret.publicKey,
    //         destination: toAccount,
    //     })
    //     .rpc();

    // Get final balances
    const finalUserBalance = await provider.connection.getTokenAccountBalance(toAccount);
    const finalCustodyBalance = await provider.connection.getTokenAccountBalance(custodyAccount);
    const updatedStakeAccount = await program.account.stakeAccountMetadataV2.fetch(metadataAccount);

    console.log('\nFinal Balances:');
    console.log('- User ATA:', finalUserBalance.value.amount);
    console.log('- Custody Account:', finalCustodyBalance.value.amount);
    console.log('- Stake Account Lock:', updatedStakeAccount.lock);
  });

});
