import { Command } from "../../flux/shell/Command";
import { EXIT_CODES } from "../../flux/shell/FluxShell";
import type { FluxCoinGlobals } from "../flux-client";

declare var globals: FluxCoinGlobals;

const command = new Command({
	name: "wallet",
	description: "Manages wallets",
	category: "None",
	subcommands: [
		{
			name: "create",
			description: "Creates a wallet",
		},
		{
			name: "login",
			description: "Logins to a wallet",
		},
	]
});

command.subcommands[0].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Create a wallet");
	const walletUsername = userInput("Username > ");
	const walletPassword = userInput("Password > ", true);

	const createResult = globals.blockChain.createWallet(walletUsername, walletPassword);
	if (!isType(createResult, "wallet")) {
		process.write(2, "Failed to create wallet: " + createResult);
		return EXIT_CODES.GENERAL_ERROR;
	}

	return EXIT_CODES.SUCCESS;
};

command.subcommands[1].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Login to your wallet");
	const walletUsername = userInput("Username > ");
	const walletPassword = userInput("Password > ", true);

	const wallet = globals.blockChain.loginWallet(walletUsername, walletPassword);
	if (!isType(wallet, "wallet")) {
		process.write(2, "Failed to login to the wallet: " + wallet);
		return EXIT_CODES.GENERAL_ERROR;
	}

	globals.wallet = wallet;
	globals.walletPassword = walletUsername;
	globals.walletPassword = walletPassword;
	return EXIT_CODES.SUCCESS;
};