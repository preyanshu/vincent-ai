import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Address, Hash, Hex } from 'viem';
import { z } from 'zod';
import { DEFAULT_NETWORK, getRpcUrl, getSupportedNetworks } from './chains.js';
import { isWalletEnabled } from './config.js';
import { getWalletProvider } from './wallet/index.js';
import * as services from './services/index.js';

/**
 * Register all EVM-related tools with the MCP server
 *
 * @param server The MCP server instance
 */
export function registerEVMTools(server: McpServer) {
	// Register read-only tools (always available)
	registerReadOnlyTools(server);


		registerWalletTools(server);


	// Register job runner tools
	registerJobRunnerTools(server);
}

/**
 * Register read-only tools that don't require wallet functionality
 */
function registerReadOnlyTools(server: McpServer) {
	// NETWORK INFORMATION TOOLS

	// Get chain information
	server.tool(
		'get_chain_info',
		'Get information about Sei network',
		{
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to Sei mainnet.")
		},
		async ({ network = DEFAULT_NETWORK }) => {
			try {
				const chainId = await services.getChainId(network);
				const blockNumber = await services.getBlockNumber(network);
				const rpcUrl = getRpcUrl(network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									network,
									chainId,
									blockNumber: blockNumber.toString(),
									rpcUrl
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching chain info: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get supported networks
	server.tool('get_supported_networks', 'Get a list of supported EVM networks', {}, async () => {
		try {
			const networks = getSupportedNetworks();

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								supportedNetworks: networks
							},
							null,
							2
						)
					}
				]
			};
		} catch (error) {
			return {
				content: [
					{
						type: 'text',
						text: `Error fetching supported networks: ${error instanceof Error ? error.message : String(error)}`
					}
				],
				isError: true
			};
		}
	});

	// BLOCK TOOLS

	// Get block by number
	server.tool(
		'get_block_by_number',
		'Get a block by its block number',
		{
			blockNumber: z.number().describe('The block number to fetch'),
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ blockNumber, network = DEFAULT_NETWORK }) => {
			try {
				const block = await services.getBlockByNumber(blockNumber, network);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(block)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching block ${blockNumber}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get latest block
	server.tool(
		'get_latest_block',
		'Get the latest block from the EVM',
		{
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ network = DEFAULT_NETWORK }) => {
			try {
				const block = await services.getLatestBlock(network);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(block)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching latest block: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// BALANCE TOOLS

	// Get Sei balance
	server.tool(
		'get_balance',
		'Get the native token balance (Sei) for an address',
		{
			address: z.string().describe("The wallet address name (e.g., '0x1234...') to check the balance for"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to Sei mainnet.")
		},
		async ({ address, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getBalance(address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address,
									network,
									wei: balance.wei.toString(),
									ether: balance.sei
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching balance: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get ERC20 balance
	server.tool(
		'get_erc20_balance',
		'Get the ERC20 token balance of an EVM address',
		{
			address: z.string().describe('The EVM address to check'),
			tokenAddress: z.string().describe('The ERC20 token contract address'),
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ address, tokenAddress, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getERC20Balance(tokenAddress as Address, address as Address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address,
									tokenAddress,
									network,
									balance: {
										raw: balance.raw.toString(),
										formatted: balance.formatted,
										decimals: balance.token.decimals
									}
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching ERC20 balance for ${address}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get ERC20 token balance
	server.tool(
		'get_token_balance',
		'Get the balance of an ERC20 token for an address',
		{
			tokenAddress: z.string().describe("The contract address name of the ERC20 token (e.g., '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1')"),
			ownerAddress: z.string().describe("The wallet address name to check the balance for (e.g., '0x1234...')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to Sei mainnet.")
		},
		async ({ tokenAddress, ownerAddress, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getERC20Balance(tokenAddress, ownerAddress, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									tokenAddress,
									owner: ownerAddress,
									network,
									raw: balance.raw.toString(),
									formatted: balance.formatted,
									symbol: balance.token.symbol,
									decimals: balance.token.decimals
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching token balance: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// TRANSACTION TOOLS

	// Get transaction by hash
	server.tool(
		'get_transaction',
		'Get detailed information about a specific transaction by its hash. Includes sender, recipient, value, data, and more.',
		{
			txHash: z.string().describe("The transaction hash to look up (e.g., '0x1234...')"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Defaults to Sei mainnet.")
		},
		async ({ txHash, network = DEFAULT_NETWORK }) => {
			try {
				const tx = await services.getTransaction(txHash as Hash, network);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(tx)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching transaction ${txHash}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get transaction receipt
	server.tool(
		'get_transaction_receipt',
		'Get a transaction receipt by its hash',
		{
			txHash: z.string().describe('The transaction hash to look up'),
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ txHash, network = DEFAULT_NETWORK }) => {
			try {
				const receipt = await services.getTransactionReceipt(txHash as Hash, network);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(receipt)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching transaction receipt ${txHash}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Estimate gas
	server.tool(
		'estimate_gas',
		'Estimate the gas cost for a transaction',
		{
			to: z.string().describe('The recipient address'),
			value: z.string().optional().describe("The amount of Sei to send (e.g., '0.1')"),
			data: z.string().optional().describe('The transaction data as a hex string'),
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ to, value, data, network = DEFAULT_NETWORK }) => {
			try {
				const params: { to: Address; value?: bigint; data?: `0x${string}` } = { to: to as Address };

				if (value) {
					params.value = services.helpers.parseEther(value);
				}

				if (data) {
					params.data = data as `0x${string}`;
				}

				const gas = await services.estimateGas(params, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									network,
									estimatedGas: gas.toString()
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error estimating gas: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);
}

/**
 * Register wallet-dependent tools that require wallet functionality
 */
function registerWalletTools(server: McpServer) {
	// TRANSFER TOOLS

	// Transfer Sei
	server.tool(
		'transfer_sei',
		'Transfer native tokens (Sei) to an address',
		{
			to: z.string().describe("The recipient address (e.g., '0x1234...'"),
			amount: z.string().describe("Amount to send in SEI (or the native token of the network), as a string (e.g., '0.1')"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ to, amount, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const txHash = await services.transferSei(to, amount, network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash,
									to,
									amount,
									network
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error transferring Sei: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC20
	server.tool(
		'transfer_erc20',
		'Transfer ERC20 tokens to another address',
		{
			tokenAddress: z.string().describe('The address of the ERC20 token contract'),
			toAddress: z.string().describe('The recipient address'),
			amount: z.string().describe("The amount of tokens to send (in token units, e.g., '10' for 10 tokens)"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ tokenAddress, toAddress, amount, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const result = await services.transferERC20(tokenAddress, toAddress, amount, network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network,
									tokenAddress,
									recipient: toAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error transferring ERC20 tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Approve ERC20 token spending
	server.tool(
		'approve_token_spending',
		'Approve another address (like a DeFi protocol or exchange) to spend your ERC20 tokens. This is often required before interacting with DeFi protocols.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token to approve for spending (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
			spenderAddress: z.string().describe('The contract address being approved to spend your tokens (e.g., a DEX or lending protocol)'),
			amount: z
				.string()
				.describe(
					"The amount of tokens to approve in token units, not wei (e.g., '1000' to approve spending 1000 tokens). Use a very large number for unlimited approval."
				),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ tokenAddress, spenderAddress, amount, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const result = await services.approveERC20(tokenAddress, spenderAddress, amount, network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network,
									tokenAddress,
									spender: spenderAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error approving token spending: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer NFT (ERC721)
	server.tool(
		'transfer_nft',
		'Transfer an NFT (ERC721 token) from one address to another. Requires the private key of the current owner for signing the transaction.',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the specific NFT to transfer (e.g., '1234')"),
			toAddress: z.string().describe('The recipient wallet address that will receive the NFT'),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Most NFTs are on Sei mainnet, which is the default."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ tokenAddress, tokenId, toAddress, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const result = await services.transferERC721(tokenAddress, toAddress, BigInt(tokenId), network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network,
									collection: tokenAddress,
									tokenId: result.tokenId,
									recipient: toAddress,
									name: result.token.name,
									symbol: result.token.symbol
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error transferring NFT: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC1155 token
	server.tool(
		'transfer_erc1155',
		'Transfer ERC1155 tokens to another address. ERC1155 is a multi-token standard that can represent both fungible and non-fungible tokens in a single contract.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC1155 token collection (e.g., '0x76BE3b62873462d2142405439777e971754E8E77')"),
			tokenId: z.string().describe("The ID of the specific token to transfer (e.g., '1234')"),
			amount: z.string().describe("The quantity of tokens to send (e.g., '1' for a single NFT or '10' for 10 fungible tokens)"),
			toAddress: z.string().describe('The recipient wallet address that will receive the tokens'),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. ERC1155 tokens exist across many networks. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ tokenAddress, tokenId, amount, toAddress, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const result = await services.transferERC1155(tokenAddress, toAddress, BigInt(tokenId), amount, network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									network,
									contract: tokenAddress,
									tokenId: result.tokenId,
									amount: result.amount,
									recipient: toAddress
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error transferring ERC1155 tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Transfer ERC20 tokens
	server.tool(
		'transfer_token',
		'Transfer ERC20 tokens to an address',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token to transfer (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
			toAddress: z.string().describe("The recipient address that will receive the tokens (e.g., '0x1234...')"),
			amount: z.string().describe("Amount of tokens to send as a string (e.g., '100' for 100 tokens). This will be adjusted for the token's decimals."),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Supports all Sei networks. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ tokenAddress, toAddress, amount, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				const result = await services.transferERC20(tokenAddress, toAddress, amount, network, privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									txHash: result.txHash,
									tokenAddress,
									toAddress,
									amount: result.amount.formatted,
									symbol: result.token.symbol,
									network
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error transferring tokens: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// CONTRACT TOOLS

	// Read contract
	server.tool(
		'read_contract',
		"Read data from a smart contract by calling a view/pure function. This doesn't modify blockchain state and doesn't require gas or signing.",
		{
			contractAddress: z.string().describe('The address of the smart contract to interact with'),
			abi: z.array(z.record(z.unknown())).describe('The ABI (Application Binary Interface) of the smart contract function, as a JSON array'),
			functionName: z.string().describe("The name of the function to call on the contract (e.g., 'balanceOf')"),
			args: z.array(z.unknown()).optional().describe("The arguments to pass to the function, as an array (e.g., ['0x1234...'])"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ contractAddress, abi, functionName, args = [], network = DEFAULT_NETWORK, privateKey }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				const params = {
					address: contractAddress as Address,
					abi: parsedAbi,
					functionName,
					args
				};

				const result = await services.readContract(params, network);

				return {
					content: [
						{
							type: 'text',
							text: services.helpers.formatJson(result)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error reading contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Write to contract
	server.tool(
		'write_contract',
		'Write data to a smart contract by calling a state-changing function. This modifies blockchain state and requires gas payment and transaction signing.',
		{
			contractAddress: z.string().describe('The address of the smart contract to interact with'),
			abi: z.array(z.record(z.unknown())).describe('The ABI (Application Binary Interface) of the smart contract function, as a JSON array'),
			functionName: z.string().describe("The name of the function to call on the contract (e.g., 'transfer')"),
			args: z.array(z.unknown()).describe("The arguments to pass to the function, as an array (e.g., ['0x1234...', '1000000000000000000'])"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ contractAddress, abi, functionName, args, network = DEFAULT_NETWORK, privateKey }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				const contractParams: Record<string, unknown> = {
					address: contractAddress as Address,
					abi: parsedAbi,
					functionName,
					args
				};

				const txHash = await services.writeContract(contractParams, privateKey, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									network,
									transactionHash: txHash,
									message: 'Contract write transaction sent successfully'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error writing to contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Deploy contract
	server.tool(
		'deploy_contract',
		'Deploy a new smart contract to the blockchain. This creates a new contract instance and returns both the deployment transaction hash and the deployed contract address.',
		{
			bytecode: z.string().describe("The compiled contract bytecode as a hex string (e.g., '0x608060405234801561001057600080fd5b50...')"),
			abi: z.array(z.record(z.unknown())).describe('The contract ABI (Application Binary Interface) as a JSON array, needed for constructor function'),
			args: z
				.array(z.unknown())
				.optional()
				.describe(
					"The constructor arguments to pass during deployment, as an array (e.g., ['param1', 'param2']). Leave empty if constructor has no parameters."
				),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet."),
			privateKey: z.string().describe("The private key of the wallet to use for the transaction")
		},
		async ({ bytecode, abi, args = [], network = DEFAULT_NETWORK, privateKey }) => {
			try {
				// Parse ABI if it's a string
				const parsedAbi = typeof abi === 'string' ? JSON.parse(abi) : abi;

				// Ensure bytecode is a proper hex string
				const formattedBytecode = bytecode.startsWith('0x') ? (bytecode as Hex) : (`0x${bytecode}` as Hex);

				const result = await services.deployContract(formattedBytecode, parsedAbi,  privateKey, network, args);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									success: true,
									network,
									contractAddress: result.address,
									transactionHash: result.transactionHash,
									message: 'Contract deployed successfully'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error deploying contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Check if address is a contract
	server.tool(
		'is_contract',
		'Check if an address is a smart contract or an externally owned account (EOA)',
		{
			address: z.string().describe("The wallet or contract address to check (e.g., '0x1234...')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet', etc.) or chain ID. Supports all Sei networks. Defaults to Sei mainnet.")
		},
		async ({ address, network = DEFAULT_NETWORK}) => {
			try {
				const isContract = await services.isContract(address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address,
									network,
									isContract,
									type: isContract ? 'Contract' : 'Externally Owned Account (EOA)'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error checking if address is a contract: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get ERC20 token information
	server.tool(
		'get_token_info',
		'Get comprehensive information about an ERC20 token including name, symbol, decimals, total supply, and other metadata. Use this to analyze any token on EVM chains.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC20 token (e.g., '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')"),
			network: z.string().optional().describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Defaults to Sei mainnet.")
		},
		async ({ tokenAddress, network = DEFAULT_NETWORK }) => {
			try {
				const tokenInfo = await services.getERC20TokenInfo(tokenAddress as Address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address: tokenAddress,
									network,
									...tokenInfo
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching token info: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get ERC20 token balance
	server.tool(
		'get_token_balance_erc20',
		'Get ERC20 token balance for an address',
		{
			address: z.string().describe('The address to check balance for'),
			tokenAddress: z.string().describe('The ERC20 token contract address'),
			network: z.string().optional().describe('Network name or chain ID. Defaults to Sei mainnet.')
		},
		async ({ address, tokenAddress, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getERC20Balance(tokenAddress as Address, address as Address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address,
									tokenAddress,
									network,
									balance: {
										raw: balance.raw.toString(),
										formatted: balance.formatted,
										decimals: balance.token.decimals
									}
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching ERC20 balance for ${address}: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Get NFT (ERC721) information
	server.tool(
		'get_nft_info',
		'Get detailed information about a specific NFT (ERC721 token), including collection name, symbol, token URI, and current owner if available.',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the specific NFT token to query (e.g., '1234')"),
			network: z.string().optional().describe("Network name (e.g., 'sei', ) or chain ID. Most NFTs are on Sei mainnet, which is the default.")
		},
		async ({ tokenAddress, tokenId, network = DEFAULT_NETWORK }) => {
			try {
				const nftInfo = await services.getERC721TokenMetadata(tokenAddress as Address, BigInt(tokenId), network);

				// Check ownership separately
				let owner: `0x${string}` | null = null;
				try {
					// This may fail if tokenId doesn't exist
					owner = await services.getPublicClient(network).readContract({
						address: tokenAddress as Address,
						abi: [
							{
								inputs: [{ type: 'uint256' }],
								name: 'ownerOf',
								outputs: [{ type: 'address' }],
								stateMutability: 'view',
								type: 'function'
							}
						],
						functionName: 'ownerOf',
						args: [BigInt(tokenId)]
					});
				} catch (e) {
					// Ownership info not available
				}

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									contract: tokenAddress,
									tokenId,
									network,
									...nftInfo,
									owner: owner || 'Unknown'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching NFT info: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Check NFT ownership
	server.tool(
		'check_nft_ownership',
		'Check if an address owns a specific NFT',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D')"),
			tokenId: z.string().describe("The ID of the NFT to check (e.g., '1234')"),
			ownerAddress: z.string().describe("The wallet address to check ownership against (e.g., '0x1234...')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet' etc.) or chain ID. Supports all Sei networks. Defaults to Sei mainnet.")
		},
		async ({ tokenAddress, tokenId, ownerAddress, network = DEFAULT_NETWORK }) => {
			try {
				const isOwner = await services.isNFTOwner(tokenAddress, ownerAddress, BigInt(tokenId), network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									tokenAddress,
									tokenId,
									ownerAddress,
									network,
									isOwner,
									result: isOwner ? 'Address owns this NFT' : 'Address does not own this NFT'
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error checking NFT ownership: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Add tool for getting ERC1155 token URI
	server.tool(
		'get_erc1155_token_uri',
		'Get the metadata URI for an ERC1155 token (multi-token standard used for both fungible and non-fungible tokens). The URI typically points to JSON metadata about the token.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC1155 token collection (e.g., '0x5B6D32f2B55b62da7a8cd553857EB6Dc26bFDC63')"),
			tokenId: z.string().describe("The ID of the specific token to query metadata for (e.g., '1234')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. ERC1155 tokens exist across many networks. Defaults to Sei mainnet.")
		},
		async ({ tokenAddress, tokenId, network = DEFAULT_NETWORK }) => {
			try {
				const uri = await services.getERC1155TokenURI(tokenAddress as Address, BigInt(tokenId), network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									contract: tokenAddress,
									tokenId,
									network,
									uri
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching ERC1155 token URI: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Add tool for getting ERC721 NFT balance
	server.tool(
		'get_nft_balance',
		'Get the total number of NFTs owned by an address from a specific collection. This returns the count of NFTs, not individual token IDs.',
		{
			tokenAddress: z.string().describe("The contract address of the NFT collection (e.g., '0x5B6D32f2B55b62da7a8cd553857EB6Dc26bFDC63')"),
			ownerAddress: z.string().describe("The wallet address to check the NFT balance for (e.g., '0x1234...')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. Most NFTs are on Sei mainnet, which is the default.")
		},
		async ({ tokenAddress, ownerAddress, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getERC721Balance(tokenAddress as Address, ownerAddress as Address, network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									collection: tokenAddress,
									owner: ownerAddress,
									network,
									balance: balance.toString()
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching NFT balance: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// Add tool for getting ERC1155 token balance
	server.tool(
		'get_erc1155_balance',
		'Get the balance of a specific ERC1155 token ID owned by an address. ERC1155 allows multiple tokens of the same ID, so the balance can be greater than 1.',
		{
			tokenAddress: z.string().describe("The contract address of the ERC1155 token collection (e.g., '0x5B6D32f2B55b62da7a8cd553857EB6Dc26bFDC63')"),
			tokenId: z.string().describe("The ID of the specific token to check the balance for (e.g., '1234')"),
			ownerAddress: z.string().describe("The wallet address to check the token balance for (e.g., '0x1234...')"),
			network: z
				.string()
				.optional()
				.describe("Network name (e.g., 'sei', 'sei-testnet', 'sei-devnet') or chain ID. ERC1155 tokens exist across many networks. Defaults to Sei mainnet.")
		},
		async ({ tokenAddress, tokenId, ownerAddress, network = DEFAULT_NETWORK }) => {
			try {
				const balance = await services.getERC1155Balance(tokenAddress as Address, ownerAddress as Address, BigInt(tokenId), network);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									contract: tokenAddress,
									tokenId,
									owner: ownerAddress,
									network,
									balance: balance.toString()
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error fetching ERC1155 token balance: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);

	// WALLET TOOLS

	// Get address from private key
	server.tool(
		'get_address_from_private_key',
		'Get the EVM address derived from a private key',
		{
			privateKey: z.string().describe("The private key to derive the address from")
		},
		async ({ privateKey }) => {
			try {
				const address = await services.getAddressFromProvider(privateKey);

				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(
								{
									address
									// Do not return the private key in the response.
								},
								null,
								2
							)
						}
					]
				};
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error deriving address from private key: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		}
	);
}
/**
 * Register job runner tools with the MCP server
 */
function registerJobRunnerTools(server: McpServer) {
	// 1. Create job for watching a wallet
	server.tool(
		'create_wallet_watch_job',
		'Use this tool when you need to set up continuous monitoring of a specific wallet address. This creates a recurring job that will automatically analyze the wallet at regular intervals to track changes in balances, transactions, token holdings, and NFT collections. Perfect for monitoring whale wallets, project treasuries, or any address you want to keep track of over time. The job will run automatically and can alert you to significant changes like large transfers or when the wallet becomes a major holder of certain tokens.',
		{
			walletAddress: z.string().describe('The wallet address to watch (0x format)'),
			intervalMinutes: z.number().min(15).max(1440).describe('How often to analyze the wallet (15-1440 minutes)'),
			options: z.object({
				includeTransactions: z.boolean().optional().describe('Include transaction analysis'),
				includeTokenBalances: z.boolean().optional().describe('Include token balance tracking'),
				includeNFTs: z.boolean().optional().describe('Include NFT holdings tracking'),
				alertThresholds: z.object({
					largeTransfer: z.number().optional().describe('Alert on transfers above this amount'),
					whalePercentage: z.number().optional().describe('Alert when wallet holds this % of token supply')
				}).optional()
			}).optional().describe('Analysis options')
		},
		async ({ walletAddress, intervalMinutes, options = {} }) => {
			try {
				const response = await fetch('http://localhost:3000/jobs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'wallet_snapshot',
						payload: {
							wallet: walletAddress,
							options: {
								includeTransactions: options.includeTransactions ?? true,
								includeTokenBalances: options.includeTokenBalances ?? true,
								includeNFTs: options.includeNFTs ?? true,
								...options.alertThresholds
							}
						},
						type: 'retry',
						intervalMinutes
					})
				});

				const result = await response.json();
				return {
					content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'create_wallet_watch_job',
					walletAddress,
					intervalMinutes,
					options,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the job-runner service is running on port 3000 and the wallet address is valid'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to create wallet watch job. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 2. Create job for watching an NFT collection
	server.tool(
		'create_nft_watch_job',
		'Use this tool when you need to monitor an NFT collection for activity patterns, trading behavior, and holder movements. This creates a recurring job that tracks NFT transfers, monitors holder distribution changes, detects new mints, and identifies suspicious patterns like wash trading or whale accumulation. Ideal for tracking popular collections, detecting market manipulation, or understanding trading dynamics. The job will automatically analyze the collection and alert you to significant events like mass transfers or when certain wallets start accumulating large numbers of NFTs.',
		{
			collectionAddress: z.string().describe('The NFT collection contract address (0x format)'),
			intervalMinutes: z.number().min(30).max(1440).describe('How often to analyze the collection (30-1440 minutes)'),
			options: z.object({
				includeTransfers: z.boolean().optional().describe('Track NFT transfers'),
				includeHolders: z.boolean().optional().describe('Track holder distribution'),
				includeMinting: z.boolean().optional().describe('Track new mints'),
				alertThresholds: z.object({
					massTransfer: z.number().optional().describe('Alert on transfers of this many NFTs'),
					whaleAccumulation: z.number().optional().describe('Alert when wallet accumulates this many NFTs')
				}).optional()
			}).optional().describe('Analysis options')
		},
		async ({ collectionAddress, intervalMinutes, options = {} }) => {
			try {
				const response = await fetch('http://localhost:3000/jobs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'analyze_nft_movements',
						payload: {
							tokenAddress: collectionAddress,
							options: {
								includeTransfers: options.includeTransfers ?? true,
								includeHolders: options.includeHolders ?? true,
								includeMinting: options.includeMinting ?? true,
								...options.alertThresholds
							}
						},
						type: 'retry',
						intervalMinutes
					})
				});

				const result = await response.json();
				return {
					content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'create_nft_watch_job',
					collectionAddress,
					intervalMinutes,
					options,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the job-runner service is running on port 3000 and the collection address is valid'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to create NFT watch job. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 3. Create job for watching a memecoin
	server.tool(
		'create_memecoin_watch_job',
		'Use this tool when you need to monitor a memecoin or token for trading activity, volume patterns, and whale movements. This creates a recurring job that tracks token flows, monitors transfer patterns, detects large movements, and generates alerts for suspicious activity. Perfect for tracking new token launches, monitoring established memecoins, or detecting pump and dump schemes. The job will automatically analyze the token and alert you to significant events like large transfers, whale accumulation, or unusual volume spikes that might indicate market manipulation.',
		{
			tokenAddress: z.string().describe('The token contract address (0x format)'),
			intervalMinutes: z.number().min(15).max(1440).describe('How often to analyze the token (15-1440 minutes)'),
			options: z.object({
				includeFlows: z.boolean().optional().describe('Track token flows and transfers'),
				includeAlerts: z.boolean().optional().describe('Generate alerts for large movements'),
				alertThresholds: z.object({
					largeTransfer: z.number().optional().describe('Alert on transfers above this amount'),
					whalePercentage: z.number().optional().describe('Alert when wallet holds this % of supply'),
					volumeSpike: z.number().optional().describe('Alert on volume spikes above this %')
				}).optional()
			}).optional().describe('Analysis options')
		},
		async ({ tokenAddress, intervalMinutes, options = {} }) => {
			try {
				const response = await fetch('http://localhost:3000/jobs', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						action: 'analyze_coin_flows',
						payload: {
							tokenAddress,
							options: {
								includeFlows: options.includeFlows ?? true,
								includeAlerts: options.includeAlerts ?? true,
								...options.alertThresholds
							}
						},
						type: 'retry',
						intervalMinutes
					})
				});

				const result = await response.json();
				return {
					content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'create_memecoin_watch_job',
					tokenAddress,
					intervalMinutes,
					options,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the job-runner service is running on port 3000 and the token address is valid'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to create memecoin watch job. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 4. Get comprehensive wallet metrics and analysis
	server.tool(
		'get_wallet_analysis',
		'Use this tool when you need a complete analysis of a wallet\'s financial position, trading activity, and asset portfolio. This provides detailed metrics including total portfolio value, token balances across multiple chains, NFT collections owned, transaction history patterns, risk assessment scores, and alert notifications for suspicious activity. Perfect for due diligence research, whale wallet monitoring, investment analysis, or understanding the complete financial footprint of any blockchain address. The tool automatically generates fresh analysis data if none exists, ensuring you get the most current information.',
		{
			walletAddress: z.string().describe('The wallet address to analyze (0x format)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to analyze (default: testnet)')
		},
		async ({ walletAddress, network = 'testnet' }) => {
			try {
				const response = await fetch(`http://localhost:3000/snapshots/wallet/${walletAddress}/all?network=${network}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							walletAddress,
							network,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};

			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_wallet_analysis',
							walletAddress,
							network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString(),
							suggestion: 'Check if the job-runner service is running on port 3000, the wallet address is valid, and try generating a new wallet snapshot first'
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 5. Get comprehensive token trading metrics and market analysis
	server.tool(
		'get_memecoin_analysis',
		'Use this tool when you need deep insights into a cryptocurrency token\'s market behavior, trading patterns, and investor activity. This provides comprehensive market analysis including trading volume metrics, holder distribution patterns, transfer flow analysis, whale movement detection, risk assessment scores, and real-time alert notifications for suspicious trading activity. Perfect for token research, market analysis, investment due diligence, or understanding the complete trading dynamics of any cryptocurrency. The tool automatically generates fresh market data if none exists, ensuring you get the most current market intelligence.',
		{
			tokenAddress: z.string().describe('The token contract address to analyze (0x format)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to analyze (default: testnet)')
		},
		async ({ tokenAddress, network = 'testnet' }) => {
			try {
				const response = await fetch(`http://localhost:3000/snapshots/memecoin/${tokenAddress}?network=${network}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							tokenAddress,
							network,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};

			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_memecoin_analysis',
							tokenAddress,
							network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString(),
							suggestion: 'Check if the job-runner service is running on port 3000, the token address is valid, and try generating a new memecoin snapshot first'
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 6. Get comprehensive NFT collection trading metrics and market analysis
	server.tool(
		'get_nft_analysis',
		'Use this tool when you need deep insights into an NFT collection\'s market behavior, trading patterns, and collector activity. This provides comprehensive market analysis including trading volume metrics, holder distribution patterns, transfer flow analysis, minting activity tracking, risk assessment scores, and real-time alert notifications for suspicious trading activity. Perfect for NFT research, collection analysis, investment due diligence, or understanding the complete trading dynamics of any NFT project. The tool automatically generates fresh market data if none exists, ensuring you get the most current market intelligence.',
		{
			collectionAddress: z.string().describe('The NFT collection contract address to analyze (0x format)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to analyze (default: testnet)')
		},
		async ({ collectionAddress, network = 'testnet' }) => {
			try {
				const response = await fetch(`http://localhost:3000/snapshots/nft/${collectionAddress}?network=${network}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							collectionAddress,
							network,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};

			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_nft_analysis',
							collectionAddress,
							network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString(),
							suggestion: 'Check if the job-runner service is running on port 3000, the collection address is valid, and try generating a new NFT snapshot first'
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);


	// 10. Get comprehensive wallet portfolio analysis across all asset types
	server.tool(
		'get_comprehensive_wallet_snapshots',
		'Use this tool when you need a complete financial portfolio analysis of a wallet across all asset types including native tokens, NFTs, and cryptocurrency tokens. This provides comprehensive cross-asset analysis including portfolio composition, trading patterns across different asset classes, risk assessment, and unified alert notifications. The tool automatically generates fresh analysis data if none exists, ensuring you get the most current portfolio intelligence. Perfect for comprehensive wallet research, portfolio analysis, or understanding the complete financial footprint of any blockchain address across multiple asset types.',
		{
			walletAddress: z.string().describe('The wallet address to get comprehensive snapshots for (0x format)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to analyze (default: testnet)')
		},
		async ({ walletAddress, network = 'testnet' }) => {
			try {
				const response = await fetch(`http://localhost:3000/snapshots/wallet/${walletAddress}/all?network=${network}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							walletAddress,
							network,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_comprehensive_wallet_snapshots',
							walletAddress,
							network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 11. Get system-wide analytics and data overview
	server.tool(
		'get_snapshot_statistics',
		'Use this tool when you need a comprehensive overview of the entire blockchain analytics system including total data coverage, system health metrics, and data freshness indicators. This provides system-wide statistics including total wallet analyses completed, NFT collections tracked, cryptocurrency tokens monitored, and latest data update timestamps. Perfect for system monitoring, data quality assessment, or understanding the overall scope and health of the blockchain analytics infrastructure.',
		{
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to get statistics for (default: testnet)')
		},
		async ({ network = 'testnet' }) => {
			try {
				const response = await fetch(`http://localhost:3000/snapshots/stats?network=${network}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							network,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_snapshot_statistics',
							network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 12. Get lightweight latest transactions for wallet (direct from blockchain)
	server.tool(
		'get_wallet_latest_transactions_lightweight',
		'Use this tool when you need the most recent transaction data for a wallet address directly from the blockchain, without the overhead of full analysis data. This provides essential transaction information including hashes, timestamps, values, and transaction types in a lightweight format perfect for quick analysis or when you need to avoid context limits. The data is stripped down to only the most important fields for efficient processing.',
		{
			walletAddress: z.string().describe('The wallet address to get latest transactions for (0x format)'),
			limit: z.number().min(1).max(100).optional().describe('Maximum number of transactions to return (1-100, default: 25)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to query (default: testnet)')
		},
		async ({ walletAddress, limit = 25, network = 'testnet' }) => {
			try {
				const apiEndpoint = network === 'mainnet' 
					? 'https://api.seistream.app' 
					: network === 'devnet' 
					? 'https://api.devnet.seistream.app' 
					: 'https://api.testnet.seistream.app';

				const response = await fetch(`${apiEndpoint}/accounts/evm/${walletAddress}/transactions?offset=0&limit=${limit}`);
				const result = await response.json() as any;

				if (!result || !result.items) {
					return {
						content: [{ 
							type: 'text', 
							text: `Error: Invalid response structure from blockchain API` 
						}],
						isError: true
					};
				}

				// Strip down transactions to essential fields only
				const lightweightTransactions = result.items.map((tx: any) => ({
					hash: tx.hash,
					timestamp: tx.timestamp,
					blockNumber: tx.blockNumber,
					from: tx.from,
					to: tx.to,
					value: tx.value,
					gasUsed: tx.gasUsed,
					gasPrice: tx.gasPrice,
					status: tx.status,
					type: tx.type,
					method: tx.method || 'transfer'
				}));

				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							walletAddress,
							network,
							totalTransactions: result.items.length,
							lightweightTransactions,
							note: 'Data stripped down to essential fields to avoid context limits'
						}, null, 2) 
					}]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'get_wallet_latest_transactions_lightweight',
					walletAddress,
					limit,
					network,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the wallet address is valid and the blockchain API is accessible'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to get lightweight wallet transactions. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 13. Get lightweight latest transactions for NFT collection (direct from blockchain)
	server.tool(
		'get_nft_latest_transactions_lightweight',
		'Use this tool when you need the most recent transfer data for an NFT collection directly from the blockchain, without the overhead of full analysis data. This provides essential transfer information including token IDs, transfer history, and transaction details in a lightweight format perfect for quick analysis or when you need to avoid context limits. The data is stripped down to only the most important fields for efficient processing.',
		{
			collectionAddress: z.string().describe('The NFT collection contract address (0x format)'),
			limit: z.number().min(1).max(100).optional().describe('Maximum number of transactions to return (1-100, default: 25)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to query (default: testnet)')
		},
		async ({ collectionAddress, limit = 25, network = 'testnet' }) => {
			try {
				const apiEndpoint = network === 'mainnet' 
					? 'https://api.seistream.app' 
					: network === 'devnet' 
					? 'https://api.devnet.seistream.app' 
					: 'https://api.testnet.seistream.app';

				const response = await fetch(`${apiEndpoint}/transfers/evm/erc721?tokenHash=${collectionAddress}&offset=0&limit=${limit}`);
				const result = await response.json() as any;

				if (!result || !result.items) {
					return {
						content: [{ 
							type: 'text', 
							text: `Error: Invalid response structure from blockchain API` 
						}],
						isError: true
					};
				}

				// Strip down transactions to essential fields only
				const lightweightTransactions = result.items.map((tx: any) => ({
					hash: tx.hash,
					timestamp: tx.timestamp,
					blockNumber: tx.blockNumber,
					from: tx.from,
					to: tx.to,
					tokenId: tx.tokenId,
					contractAddress: tx.contractAddress,
					gasUsed: tx.gasUsed,
					gasPrice: tx.gasPrice,
					status: tx.status,
					type: tx.type || 'transfer'
				}));

				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							collectionAddress,
							network,
							totalTransactions: result.items.length,
							lightweightTransactions,
							note: 'Data stripped down to essential fields to avoid context limits'
						}, null, 2) 
					}]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'get_nft_latest_transactions_lightweight',
					collectionAddress,
					limit,
					network,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the collection address is valid and the blockchain API is accessible'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to get lightweight NFT transactions. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 14. Get lightweight latest transactions for memecoin/token (direct from blockchain)
	server.tool(
		'get_memecoin_latest_transactions_lightweight',
		'Use this tool when you need the most recent transfer data for a memecoin or token directly from the blockchain, without the overhead of full analysis data. This provides essential transfer information including amounts, sender/receiver addresses, and transaction details in a lightweight format perfect for quick analysis or when you need to avoid context limits. The data is stripped down to only the most important fields for efficient processing.',
		{
			tokenAddress: z.string().describe('The token contract address (0x format)'),
			limit: z.number().min(1).max(100).optional().describe('Maximum number of transactions to return (1-100, default: 25)'),
			network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network to query (default: testnet)')
		},
		async ({ tokenAddress, limit = 25, network = 'testnet' }) => {
			try {
				const apiEndpoint = network === 'mainnet' 
					? 'https://api.seistream.app' 
					: network === 'devnet' 
					? 'https://api.devnet.seistream.app' 
					: 'https://api.testnet.seistream.app';

				const response = await fetch(`${apiEndpoint}/transfers/evm/erc20?tokenHash=${tokenAddress}&offset=0&limit=${limit}`);
				const result = await response.json() as any;

				if (!result || !result.items) {
					return {
						content: [{ 
							type: 'text', 
							text: `Error: Invalid response structure from blockchain API` 
						}],
						isError: true
					};
				}

				// Strip down transactions to essential fields only
				const lightweightTransactions = result.items.map((tx: any) => ({
					hash: tx.hash,
					timestamp: tx.timestamp,
					blockNumber: tx.blockNumber,
					from: tx.from,
					to: tx.to,
					value: tx.value,
					decimals: tx.decimals,
					symbol: tx.symbol,
					gasUsed: tx.gasUsed,
					gasPrice: tx.gasPrice,
					status: tx.status,
					type: tx.type || 'transfer'
				}));

				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							tokenAddress,
							network,
							totalTransactions: result.items.length,
							lightweightTransactions,
							note: 'Data stripped down to essential fields to avoid context limits'
						}, null, 2) 
					}]
				};
			} catch (error) {
				const errorDetails = {
					tool: 'get_memecoin_latest_transactions_lightweight',
					tokenAddress,
					limit,
					network,
					error: error instanceof Error ? {
						name: error.name,
						message: error.message,
						stack: error.stack
					} : String(error),
					timestamp: new Date().toISOString(),
					suggestion: 'Check if the token address is valid and the blockchain API is accessible'
				};
				
				return {
					content: [{ 
						type: 'text', 
						text: `Failed to get lightweight memecoin transactions. Detailed error information:\n\n${JSON.stringify(errorDetails, null, 2)}` 
					}],
					isError: true
				};
			}
		}
	);

	// 15. Get all jobs
	server.tool(
		'get_all_jobs',
		'Use this tool when you need to retrieve a list of all jobs in the system. This provides a complete overview of job statuses, types, and basic information for monitoring and management purposes.',
		{
			
		},
		async ({ }) => {
			try {
				const response = await fetch(`http://localhost:3000/jobs`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
						
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_all_jobs',
							
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 16. Get specific job details
	server.tool(
		'get_job_details',
		'Use this tool when you need detailed information about a specific job including its logs, status, and execution history. Perfect for debugging job issues or monitoring job progress.',
		{
			jobId: z.string().describe('The unique ID of the job to retrieve details for'),
			// network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network context (default: testnet)')
		},
		async ({ jobId }) => {
			try {
				const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							jobId,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_job_details',
							jobId,
							// network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 17. Get job logs
	server.tool(
		'get_job_logs',
		'Use this tool when you need to retrieve logs for a specific job for debugging and monitoring purposes. You can filter by log level and limit the number of results returned.',
		{
			jobId: z.string().describe('The unique ID of the job to retrieve logs for'),
			level: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).optional().describe('Filter logs by level (optional)'),
			limit: z.number().min(1).max(1000).optional().describe('Maximum number of logs to return (1-1000, default: 100)'),
			source: z.string().optional().describe('Filter logs by source (e.g., service_function)'),
			// network: z.enum(['mainnet', 'testnet', 'devnet']).optional().describe('Network context (default: testnet)')
		},
		async ({ jobId, level, limit = 100, source }) => {
			try {
				const params = new URLSearchParams({ });
				if (level) params.append('level', level);
				if (limit) params.append('limit', limit.toString());
				if (source) params.append('source', source);

				const response = await fetch(`http://localhost:3000/jobs/${jobId}/logs?${params.toString()}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							jobId,
							// network,
							filters: { level, limit, source },
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_job_logs',
							jobId,
							// network,
							filters: { level, limit, source },
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 18. Get job service logs
	server.tool(
		'get_job_service_logs',
		'Use this tool when you need to retrieve service-specific logs for a job. These are logs generated by the actual service functions during job execution, useful for debugging service-level issues.',
		{
			jobId: z.string().describe('The unique ID of the job to retrieve service logs for'),
			level: z.enum(['ERROR', 'WARN', 'INFO', 'DEBUG']).optional().describe('Filter logs by level (optional)'),
			limit: z.number().min(1).max(1000).optional().describe('Maximum number of logs to return (1-1000, default: 100)')
		},
		async ({ jobId, level, limit = 100}) => {
			try {
				const params = new URLSearchParams({ });
				if (level) params.append('level', level);
				if (limit) params.append('limit', limit.toString());

				const response = await fetch(`http://localhost:3000/jobs/${jobId}/service-logs?${params.toString()}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							jobId,
							// network,
							filters: { level, limit },
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_job_service_logs',
							jobId,
							// network,
							filters: { level, limit },
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 19. Get failed jobs
	server.tool(
		'get_failed_jobs',
		'Use this tool when you need to retrieve a list of jobs that have failed execution. This is essential for monitoring system health and identifying problematic patterns or issues that need attention.',
		{
			limit: z.number().min(1).max(500).optional().describe('Maximum number of failed jobs to return (1-500, default: 50)')
		},
		async ({ limit = 50}) => {
			try {
				const response = await fetch(`http://localhost:3000/jobs/failed?limit=${limit}`);
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							limit,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'get_failed_jobs',
							// network,
							limit,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);

	// 20. Delete job
	server.tool(
		'delete_job',
		'Use this tool when you need to remove a job from the system. This will delete the job from both the queue (if pending) and the database. Use with caution as this action cannot be undone. Active jobs cannot be removed from the queue but will be deleted from the database.',
		{
			jobId: z.string().describe('The unique ID of the job to delete'),

		},
		async ({ jobId}) => {
			try {
				const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
					method: 'DELETE'
				});
				const result = await response.json() as any;
				
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: true,
							jobId,
							timestamp: new Date().toISOString(),
							data: result
						}, null, 2)
					}]
				};
			} catch (error) {
				return {
					content: [{ 
						type: 'text', 
						text: JSON.stringify({
							success: false,
							tool: 'delete_job',
							jobId,
							// network,
							error: error instanceof Error ? {
								name: error.name,
								message: error.message,
								stack: error.stack
							} : String(error),
							timestamp: new Date().toISOString()
						}, null, 2)
					}],
					isError: true
				};
			}
		}
	);
}

