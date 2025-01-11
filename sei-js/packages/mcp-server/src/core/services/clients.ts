import { http, type Address, type Hex, type PublicClient, type WalletClient, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { DEFAULT_NETWORK, getChain, getRpcUrl } from '../chains.js';
import { getWalletProvider } from '../wallet/index.js';

// Cache for clients to avoid recreating them for each request
const clientCache = new Map<string, PublicClient>();

/**
 * Get a public client for a specific network
 */
export function getPublicClient(network = DEFAULT_NETWORK): PublicClient {
	const cacheKey = String(network);

	// Return cached client if available
	if (clientCache.has(cacheKey)) {
		const cachedClient = clientCache.get(cacheKey);
		// This should never happen as we just checked with has(), but better to be safe
		if (!cachedClient) {
			throw new Error(`Client cache inconsistency for network ${network}`);
		}
		return cachedClient;
	}

	// Create a new client
	const chain = getChain(network);
	const rpcUrl = getRpcUrl(network);

	const client = createPublicClient({
		chain,
		transport: http(rpcUrl)
	});

	// Cache the client
	clientCache.set(cacheKey, client);

	return client;
}

/**
 * Get a wallet client using the configured wallet provider
 */
export async function getWalletClientFromProvider(network = DEFAULT_NETWORK, privateKey?: string): Promise<WalletClient> {
	const walletProvider = getWalletProvider(privateKey);
	// If privateKey is provided, pass it to the method; otherwise use empty string for environment key
	return walletProvider.getWalletClient(network, privateKey || '');
}

/**
 * Get an EVM address from the configured wallet provider
 */
export async function getAddressFromProvider(privateKey?: string): Promise<Address> {
	const walletProvider = getWalletProvider(privateKey);
	// If privateKey is provided, pass it to the method; otherwise use empty string for environment key
	return walletProvider.getAddress(privateKey || '');
}
