#!/bin/bash
param=""
case $net in
  devnet)
    param="-ud"
    ;;
  testnet)
    param="-ut"
    ;;
  mainnet)
    param="-um"
    ;;
  *)
    param="-ul" # localnet
    ;;
esac

echo "Deploying staking program"
solana program deploy $param target/deploy/staking.so --program-id target/deploy/staking-keypair.json
echo "Deploying integrity pool program"
solana program deploy $param target/deploy/integrity_pool.so --program-id target/deploy/integrity_pool-keypair.json
echo "Deploying publisher caps program"
solana program deploy $param target/deploy/publisher_caps.so --program-id target/deploy/publisher_caps-keypair.json
echo "Creating token"
token=$(spl-token $param create-token --decimals 6 --output json | jq -r '.commandOutput.address')
echo "{ \"mintToken\": \"$token\" }" > deploy-data.json

spl-token $param create-account $token
spl-token $param mint $token 100
