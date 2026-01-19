import { Command } from "./shell/Command";
import { EXIT_CODES, FluxShell } from "./shell/FluxShell";
import { requireLib } from "./utils/libokka";

declare var globals: {
	userSubwallets: GreyHack.SubWallet[],
	currentSubwallet: GreyHack.SubWallet | null,
	walletUsername: string,
	walletPassword: string,
	wallet: GreyHack.Wallet,
};

FluxShell.initialize();

const quitCmd = new Command({
	name: "quit",
	description: "Quits the script",
	category: "Other",
});

quitCmd.run = () => exit("");

const subwalletCmd = new Command({
	name: "subwallet",
	description: "Manages subwallets",
	category: "Other",
	subcommands: [
		{
			name: "create",
			description: "Creates a subwallet",
		},
		{
			name: "login",
			description: "Logins to a subwallet",
		},
	]
});

subwalletCmd.subcommands[0].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Create a subwallet");
	const subwalletUsername = userInput("Username > ");
	if (isType(coin.getSubwallet(subwalletUsername), "subwallet")) {
		process.write(2, "This user already exists");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const subwalletPassword = userInput("Password > ", true);
	const createResult = coin.createSubWallet(walletUsername, wallet.getPin(), subwalletUsername, subwalletPassword);
	if (createResult !== true) {
		process.write(2, "Failed to create subwallet: " + createResult);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const subwallet = coin.getSubwallet(subwalletUsername) as GreyHack.SubWallet;
	globals.userSubwallets.push(subwallet);
	globals.currentSubwallet = subwallet;

	return EXIT_CODES.SUCCESS;
};

subwalletCmd.subcommands[1].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Login to your subwallet");
	const subwalletUsername = userInput("Username > ");
	const subwalletPassword = userInput("Password > ", true);

	const subwallet = coin.getSubwallet(subwalletUsername);
	if (!isType(subwallet, "subwallet")) {
		process.write(2, "Failed to login to the subwallet: " + subwallet);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const passCorrect = subwallet.checkPassword(subwalletPassword);
	if (passCorrect !== true) {
		process.write(2, "Invalid password");
		return EXIT_CODES.GENERAL_ERROR;
	}

	globals.currentSubwallet = subwallet;
	return EXIT_CODES.SUCCESS;
};

let blockChain = requireLib("blockchain.so");
if (!blockChain) exit("<color=red>Failed to find blockchain.so");

const coin = blockChain.getCoin("flux", "okka", "kissa") as GreyHack.Coin;
if (!isType(coin, "coin")) exit(`<color=red>Failed to get the flux coin: ${coin}`);

print("<color=#7fff00>Login to your wallet");
const walletUsername = userInput("Username > ");
const walletPassword = userInput("Password > ");
const wallet = blockChain.loginWallet(walletUsername, walletPassword) as GreyHack.Wallet;
if (!isType(wallet, "wallet")) exit("<color=red>Failed to get your wallet");

globals.userSubwallets = [];
globals.currentSubwallet = null;

const coinSubwallets = coin.getSubwallets();
if (isType(coinSubwallets, "list")) {
	for (const subwallet of coinSubwallets) {
		if (subwallet.walletUsername() === walletPassword) {
			globals.userSubwallets.push(subwallet);
		}
	}
}

if (globals.userSubwallets.length) {
	FluxShell.handleInput("subwallet login");
}
else {
	FluxShell.handleInput("subwallet create");
}

FluxShell.startInputLoop();