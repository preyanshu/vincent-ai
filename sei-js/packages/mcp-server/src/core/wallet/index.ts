import { getWalletMode } from '../config.js';
import { DisabledWalletProvider } from './providers/disabled.js';
import { PrivateKeyWalletProvider } from './providers/private-key.js';
import type { WalletProvider } from './types.js';

// Cache wallet provider instance
let walletProviderInstance: WalletProvider | null = null;

/**
 * Get the wallet provider instance based on configuration
 * Note: When a privateKey is provided, we create a new instance each time
 * to avoid caching issues with different private keys
 */
export function getWalletProvider(privateKey?: string): WalletProvider {
	const mode = getWalletMode();

	switch (mode) {
		case 'private-key':
			// If privateKey is provided, create a new instance (don't cache)
			if (privateKey) {
				return new PrivateKeyWalletProvider(privateKey);
			}
			// Otherwise use cached instance or create one from environment
			if (!walletProviderInstance) {
				walletProviderInstance = new PrivateKeyWalletProvider(privateKey);
			}
			return walletProviderInstance;
		case 'disabled':
			if (!walletProviderInstance) {
				walletProviderInstance = new PrivateKeyWalletProvider(privateKey);
			}
			return walletProviderInstance;
		default:
			throw new Error(`Unknown wallet mode: ${mode}`);
	}
}

/**
 * Reset the wallet provider instance (useful for testing)
 */
export function resetWalletProvider(): void {
	walletProviderInstance = null;
}

// Export types and classes
export * from './types.js';
export { PrivateKeyWalletProvider } from './providers/private-key.js';
export { DisabledWalletProvider } from './providers/disabled.js';
