/**
 * near.ts — lightweight NEAR Testnet wallet helper using near-api-js v7
 * Uses the classic WalletConnection pattern (redirect-based sign-in)
 */
import { connect, keyStores, WalletConnection } from 'near-api-js';

const APP_KEY_PREFIX = 'guardianlens';

const config = {
  networkId: 'testnet',
  keyStore: new keyStores.BrowserLocalStorageKeyStore(),
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://testnet.mynearwallet.com',
  helperUrl: 'https://helper.testnet.near.org',
};

let _wallet: WalletConnection | null = null;

export async function initNear(): Promise<WalletConnection> {
  if (_wallet) return _wallet;
  const near = await connect(config);
  _wallet = new WalletConnection(near, APP_KEY_PREFIX);
  return _wallet;
}

export async function signIn(): Promise<void> {
  const wallet = await initNear();
  await wallet.requestSignIn({
    successUrl: window.location.origin + '/',
    failureUrl: window.location.origin + '/',
  });
}

export async function signOut(): Promise<void> {
  const wallet = await initNear();
  wallet.signOut();
}
