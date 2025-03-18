solana program deploy -ud target/deploy/staking.so --program-id target/deploy/staking-keypair.json
verify when master-repo
solana program deploy -ud target/deploy/integrity_pool.so --program-id target/deploy/integrity_pool-keypair.json
solana program deploy -ud target/deploy/publisher_caps.so --program-id target/deploy/publisher_caps-keypair.json
spl-token -ud create-token
FzU14SCpFXTTJq6DuyZrFjE3Pm1SiAZZiivKcJvtQJE4
