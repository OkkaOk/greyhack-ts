import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import { formatColumnsf, ynPrompt } from "../utils/libokka";

declare var globals: {
	blockChain: GreyHack.BlockChain,
	coin: GreyHack.Coin,
	userSubWallets: GreyHack.SubWallet[],
	currentSubWallet: GreyHack.SubWallet | null,
	walletUsername: string,
	walletPassword: string,
	wallet: GreyHack.Wallet,
};

const command = new Command({
	name: "subwallet",
	description: "Manages subwallets",
	category: "None",
	subcommands: [
		{
			name: "create",
			description: "Creates a subwallet",
		},
		{
			name: "login",
			description: "Logins to a subwallet",
		},
		{
			name: "list",
			description: "Lists current wallet's subwallets for this coin",
		},
		{
			name: "delete",
			description: "Deletes the current subwallet",
		},
	]
});

command.subcommands[0].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Create a subwallet");
	const subwalletUsername = userInput("Username > ");
	if (isType(globals.coin.getSubwallet(subwalletUsername), "subwallet")) {
		process.write(2, "This user already exists");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const subwalletPassword = userInput("Password > ", true);
	const createResult = globals.coin.createSubWallet(globals.walletUsername, globals.wallet.getPin(), subwalletUsername, subwalletPassword);
	if (createResult !== true) {
		process.write(2, "Failed to create subwallet: " + createResult);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const subwallet = globals.coin.getSubwallet(subwalletUsername) as GreyHack.SubWallet;
	globals.userSubWallets.push(subwallet);
	globals.currentSubWallet = subwallet;

	return EXIT_CODES.SUCCESS;
};

command.subcommands[1].run = function (_args, _options, process) {
	process.write(1, "<color=#7fff00>Login to your subwallet");
	const subwalletUsername = userInput("Username > ");
	const subwalletPassword = userInput("Password > ", true);

	const subwallet = globals.coin.getSubwallet(subwalletUsername);
	if (!isType(subwallet, "subwallet")) {
		process.write(2, "Failed to login to the subwallet: " + subwallet);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const passCorrect = subwallet.checkPassword(subwalletPassword);
	if (passCorrect !== true) {
		process.write(2, "Invalid password");
		return EXIT_CODES.GENERAL_ERROR;
	}

	globals.currentSubWallet = subwallet;
	return EXIT_CODES.SUCCESS;
};

command.subcommands[2].run = function (_args, _options, process) {
	const subWallets = globals.coin.getSubwallets();
	if (isType(subWallets, "string")) {
		process.write(2, `Failed to list subwallets: ${subWallets}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const output = ["NAME BALANCE"];

	for (const subWallet of subWallets) {
		if (subWallet.walletUsername() === globals.walletUsername)
			output.push(`${subWallet.getUser()} ${subWallet.getBalance()}`);
	}

	process.write(1, formatColumnsf(output, "left"));

	return EXIT_CODES.SUCCESS;
};

command.subcommands[3].run = function (_args, _options, process) {
	const subWallet = globals.currentSubWallet;
	if (!subWallet) {
		process.write(2, "You haven't logged in to a subwallet yet");
		return EXIT_CODES.MISUSE;
	}

	const balance = subWallet.getBalance();
	if (isType(balance, "number") && balance > 0) {
		const yn = ynPrompt(`This subwallet has ${balance} coins. Delete anyway`, "n");
		if (yn === "n") return EXIT_CODES.SUCCESS;
	}

	const result = subWallet.delete();
	if (isType(result, "string")) {
		process.write(2, `Failed to delete subwallet: ${result}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, `<color=green>Subwallet '${subWallet.getUser()}' deleted!`);
	globals.currentSubWallet = null;
	return EXIT_CODES.SUCCESS;
};