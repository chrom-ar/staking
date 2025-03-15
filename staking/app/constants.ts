import { PublicKey } from "@solana/web3.js";

export function GOVERNANCE_ADDRESS(): PublicKey {
  return new PublicKey("pytGY6tWRgGinSCvRLnSv4fHfBTMoiDGiCsesmHWM6U");
}

export const STAKING_ADDRESS = new PublicKey(
  "7VgwUAtQbEyd2Ssa9ajMyUJFpbdxNYAKsmkECtZbw3pp"
);

export const WALLET_TESTER_ADDRESS = new PublicKey(
  "321KojcMTHwEwzDjt9j71iowtqMPMrfvQ6at1xbJdJWS"
);

export const PROFILE_ADDRESS = new PublicKey(
  "bR3uQJLEmg2H46GuozXn8uNQmp2DaZEp6EK1kW56npd"
);

export const REALM_ID = new PublicKey(
  "4ct8XU5tKbMNRphWy4rePsS9kBqPhDdvZoGpmprPaug4"
);

// This one is valid on mainnet only
export const PYTH_TOKEN = new PublicKey(
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"
);

export const EPOCH_DURATION = 3600 * 24 * 7;
