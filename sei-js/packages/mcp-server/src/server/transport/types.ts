import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type TransportMode = 'stdio' | 'streamable-http' | 'http-sse';
export interface McpTransport {
	start(server: McpServer): Promise<void>;
	stop(): Promise<void>;
	readonly mode: TransportMode;
}

export interface TransportConfig {
	mode: TransportMode;
	walletMode: 'disabled' | 'private-key';
	port: number; // Required for HTTP-based transports
	host: string; // Required for HTTP-based transports
	path: string; // Required for HTTP-based transports
}
