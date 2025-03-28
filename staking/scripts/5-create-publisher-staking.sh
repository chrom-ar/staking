#!/bin/bash

set -x

./target/release/staking-cli --keypair $HOME/.config/solana/id.json --rpc-url "http://localhost:8899" initialize-pool-reward-custody


# Ask for airdrop
solana airdrop -ul 100000 --keypair publisher.json

# publisher new stake
./target/release/staking-cli --keypair publisher.json --rpc-url "http://localhost:8899" new-stake-account --agreement-hash 123

## We need to create publisher caps
./target/release/staking-cli --rpc-url "http://localhost:8899" --keypair $HOME/.config/solana/id.json build-publisher-caps --publishers "5316ZeWzMAspZByCAVTiNqgwm9By8GooPdrmEbFttCiU" --publisher-caps "100"


stakeAccCustody=$(cat publisher-data.json | jq -r '.stakeAccountCustody')
mint=$(cat deploy-data.json | jq -r '.mintToken')
spl-token -ul mint $mint 100 $stakeAccCustody --fee-payer ~/.config/solana/id.json
