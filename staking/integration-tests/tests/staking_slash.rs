use integration_tests::utils::clock::get_current_epoch;
use {
    anchor_spl::token::TokenAccount,
    integration_tests::{
        assert_anchor_program_error,
        setup::{
            setup,
            SetupProps,
            SetupResult,
        },
        solana::{
            instructions::create_token_account,
            utils::{
                fetch_account_data,
                fetch_positions_account,
            },
        },
        staking::{
            helper_functions::initialize_new_stake_account,
            instructions::{
                create_position,
                slash_staking,
                update_pool_authority,
            },
            pda::{
                get_stake_account_metadata_address,
                get_target_address,
            },
        },
        utils::clock::advance_n_epochs,
    },
    integrity_pool::utils::types::FRAC_64_MULTIPLIER,
    solana_sdk::{
        signature::Keypair,
        signer::Signer,
    },
    staking::{
        error::ErrorCode,
        state::{
            positions::TargetWithParameters,
            stake_account::StakeAccountMetadataV2,
            target::TargetMetadata,
        },
    },
};


#[test]
fn test_staking_slash() {
    let SetupResult {
        mut svm,
        payer,
        pyth_token_mint,
        publisher_keypair,
        pool_data_pubkey: _,
        reward_program_authority: _,
        maybe_publisher_index: _,
    } = setup(SetupProps {
        init_config:            true,
        init_target:            true,
        init_mint:              true,
        init_pool_data:         true,
        init_publishers:        true,
        reward_amount_override: None,
    });

    let stake_account_positions =
        initialize_new_stake_account(&mut svm, &payer, &pyth_token_mint, true, true);

    let pool_authority = Keypair::new();

    let slash_token_account = create_token_account(&mut svm, &payer, &pyth_token_mint.pubkey());

    update_pool_authority(&mut svm, &payer, pool_authority.pubkey());

    let tx = create_position(
        &mut svm,
        &payer,
        stake_account_positions,
        staking::state::positions::TargetWithParameters::IntegrityPool {
            publisher: publisher_keypair.pubkey(),
        },
        Some(&pool_authority),
        95 * FRAC_64_MULTIPLIER,
    )
    .unwrap();
    for log in &tx.logs {
        println!("XX create position log:  {:?}", log);
    }
    create_position(
        &mut svm,
        &payer,
        stake_account_positions,
        staking::state::positions::TargetWithParameters::Voting,
        None,
        15 * FRAC_64_MULTIPLIER,
    )
    .unwrap();
    svm.expire_blockhash();

    create_position(
        &mut svm,
        &payer,
        stake_account_positions,
        staking::state::positions::TargetWithParameters::Voting,
        None,
        80 * FRAC_64_MULTIPLIER,
    )
    .unwrap();
    // svm.expire_blockhash();
    // create_position(
    //     &mut svm,
    //     &payer,
    //     stake_account_positions,
    //     staking::state::positions::TargetWithParameters::Voting,
    //     None,
    //     7 * FRAC_64_MULTIPLIER,
    // )
    // .unwrap();
    // svm.expire_blockhash();

    let stake_account_metadata = get_stake_account_metadata_address(stake_account_positions);
    let metadata_account: StakeAccountMetadataV2 =
        fetch_account_data(&mut svm, &stake_account_metadata);
    assert_eq!(metadata_account.next_index, 3);

    // initiate delegate at epoch N
    // position will become LOCKED at epoch N+1
    // at epoch N+2, we can slash epoch N+1
    advance_n_epochs(&mut svm, &payer, 2);
    advance_n_epochs(&mut svm, &payer, 50);

    assert_anchor_program_error!(
        slash_staking(
            &mut svm,
            &payer,
            stake_account_positions,
            &pool_authority,
            FRAC_64_MULTIPLIER + 1,
            publisher_keypair.pubkey(),
            slash_token_account.pubkey(),
        ),
        ErrorCode::InvalidSlashRatio,
        0
    );

    let mut stake_positions_account = fetch_positions_account(&mut svm, &stake_account_positions);
    let positions = stake_positions_account.to_dynamic_position_array();
    let pos0 = positions.read_position(0).unwrap().unwrap();

    // assert_eq!(pos0.amount, 50 * FRAC_64_MULTIPLIER);
    // assert_eq!(
    //     pos0.target_with_parameters,
    //     TargetWithParameters::IntegrityPool {
    //         publisher: publisher_keypair.pubkey(),
    //     }
    // );


    // println!("Position 2: {:?}", pos2);


    // svm.expire_blockhash();

    let slash_meta = slash_staking(
        &mut svm,
        &payer,
        stake_account_positions,
        &pool_authority,
        FRAC_64_MULTIPLIER,
        publisher_keypair.pubkey(),
        slash_token_account.pubkey(),
    )
    .unwrap();

    for log in &slash_meta.logs {
        println!("{:?}", log);
    }
    advance_n_epochs(&mut svm, &payer, 50);
    println!("Advanced and slashing again");
    let slash_meta = slash_staking(
        &mut svm,
        &payer,
        stake_account_positions,
        &pool_authority,
        FRAC_64_MULTIPLIER,
        publisher_keypair.pubkey(),
        slash_token_account.pubkey(),
    ).unwrap();

    for log in &slash_meta.logs {
        println!("{:?}", log);
    }
    // println!("Slashing logs: {:?}", slash_meta.logs);

    let mut stake_positions_account = fetch_positions_account(&mut svm, &stake_account_positions);
    let positions = stake_positions_account.to_dynamic_position_array();
    let pos0 = positions.read_position(0).unwrap().unwrap();
    let pos0_algo = pos0.get_current_position( get_current_epoch(&mut svm)).unwrap();
    println!("Position 0: {:?} {:?}", pos0, pos0_algo);
    let pos1 = positions.read_position(1).unwrap().unwrap();
    let pos1_algo = pos1.get_current_position( get_current_epoch(&mut svm)).unwrap();
    println!("Position 1: {:?} {:?}", pos1, pos1_algo);
    let pos2 = positions.read_position(2).unwrap().unwrap();
    let pos2_algo = pos2.get_current_position( get_current_epoch(&mut svm)).unwrap();
    println!("Position 2: {:?} {:?}", pos2, pos2_algo);
    let pos3 = positions.read_position(3).unwrap().unwrap();
    let pos3_algo = pos3.get_current_position( get_current_epoch(&mut svm)).unwrap();
    println!("Position 3: {:?} {:?}", pos3, pos3_algo);

    let mut stake_positions_account = fetch_positions_account(&mut svm, &stake_account_positions);
    let positions = stake_positions_account.to_dynamic_position_array();
    let pos0 = positions.read_position(0).unwrap().unwrap();

    assert_eq!(pos0.amount, 25 * FRAC_64_MULTIPLIER);
    assert_eq!(
        pos0.target_with_parameters,
        TargetWithParameters::IntegrityPool {
            publisher: publisher_keypair.pubkey(),
        }
    );

    let pos1 = positions.read_position(1).unwrap().unwrap();
    assert_eq!(pos1.amount, 75 * FRAC_64_MULTIPLIER);
    assert_eq!(pos1.target_with_parameters, TargetWithParameters::Voting);

    let slash_account: TokenAccount = fetch_account_data(&mut svm, &slash_token_account.pubkey());

    assert_eq!(slash_account.amount, 25 * FRAC_64_MULTIPLIER);

    let stake_account_metadata = get_stake_account_metadata_address(stake_account_positions);
    let metadata_account: StakeAccountMetadataV2 =
        fetch_account_data(&mut svm, &stake_account_metadata);

    assert_eq!(metadata_account.next_index, 2);
    assert!(positions.read_position(2).unwrap().is_none());

    let target_account: TargetMetadata = fetch_account_data(&mut svm, &get_target_address());
    assert_eq!(target_account.locked, 75 * FRAC_64_MULTIPLIER);
    assert_eq!(target_account.prev_epoch_locked, 75 * FRAC_64_MULTIPLIER);
    assert_eq!(target_account.delta_locked, 0);
}
