import { Command } from "../flux/shell/Command";
import { FluxShell } from "../flux/shell/FluxShell";
import { requireLib } from "../utils/libokka";

export type FluxCoinGlobals = {
	blockChain: GreyHack.BlockChain,
	coin: GreyHack.Coin,
	userSubWallets: GreyHack.SubWallet[],
	currentSubWallet: GreyHack.SubWallet | null,
	walletUsername: string,
	walletPassword: string,
	wallet: GreyHack.Wallet,
};

declare var globals: FluxCoinGlobals;

FluxShell.initialize();

const quitCmd = new Command({
	name: "quit",
	description: "Quits the script",
	category: "None",
});

quitCmd.run = (_args, _opts, _process) => exit("");

include("../flux/commands/help.ts");
include("./commands");

FluxShell.raw.commands["help"].category = "None";

globals.blockChain = requireLib("blockchain.so") as GreyHack.BlockChain;
if (!globals.blockChain) exit("<color=red>Failed to find blockchain.so");

const coin = globals.blockChain.getCoin("flux", "okka", "kissa") as GreyHack.Coin;
if (!isType(coin, "coin")) exit(`<color=red>Failed to get the flux coin: ${coin}`);

FluxShell.handleInput("wallet login");
if (!isType(globals.wallet, "wallet")) exit("<color=red>Failed to get your wallet");

globals.userSubWallets = [];
globals.currentSubWallet = null;

const coinSubwallets = coin.getSubwallets();
if (isType(coinSubwallets, "list")) {
	for (const subwallet of coinSubwallets) {
		if (subwallet.walletUsername() === globals.walletUsername) {
			globals.userSubWallets.push(subwallet);
		}
	}
}

if (globals.userSubWallets.length) {
	FluxShell.handleInput("subwallet login");
}
else {
	FluxShell.handleInput("subwallet create");
}

FluxShell.startInputLoop(() => {
	const userSymbol = activeUser() === "root" ? "#" : "$";

	const walletName = globals.walletUsername;
	let subWalletName = "none";
	if (globals.currentSubWallet) {
		subWalletName = globals.currentSubWallet.getUser();
	}

	return `<b><color=green>${walletName}-${subWalletName}@flux</color>:<color=#28A9DB>${currentPath()}</color>${userSymbol} `;
});