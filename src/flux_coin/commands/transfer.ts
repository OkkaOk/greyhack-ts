import { Command } from "../../flux/shell/Command";
import { EXIT_CODES } from "../../flux/shell/FluxShell";
import type { FluxCoinGlobals } from "../flux-client";

declare var globals: FluxCoinGlobals;

const command = new Command({
	name: "transfer",
	description: "Transfer coins to another subwallet",
	category: "None",
	arguments: [
		{
			name: "target",
			description: "The target subwallet's name",
			required: true,
		},
		{
			name: "amount",
			description: "The amount of coins to transfer",
			required: true,
		}
	]
});

command.run = function (args, _options, process) {
	if (!globals.currentSubWallet) {
		process.write(2, "<color=red>You haven't logged in to a subwallet");
		return EXIT_CODES.MISUSE;
	}

	const targetSubWallet = globals.coin.getSubwallet(args[0]);
	if (!isType(targetSubWallet, "subwallet")) {
		process.write(2, "Target subwallet not found");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const amount = args[1].toInt();
	if (isType(amount, "string")) {
		process.write(2, "Invalid 'amount' argument");
		return EXIT_CODES.MISUSE;
	}

	const balance = globals.currentSubWallet.getBalance();
	if (isType(balance, "string")) {
		process.write(2, "Failed to get account balance");
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (amount > balance) {
		process.write(2, "You don't have enough coins");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const result = globals.coin.transaction(globals.currentSubWallet.getUser(), args[0], amount);
	if (result !== true) {
		process.write(2, `Transaction failed: ${result}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, `<color=green>Transferred ${amount} to ${args[0]}`);
	return EXIT_CODES.SUCCESS;
};