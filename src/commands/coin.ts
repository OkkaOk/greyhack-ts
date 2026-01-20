import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import type { Process } from "../shell/Process";
import { requireLib } from "../utils/libokka";

interface Ext {
	getWallet: (process: Process) => GreyHack.Wallet | null;
	getCoin: (process: Process) => GreyHack.Coin | null;
}

const command = new Command<Ext>({
	name: "coin",
	description: "Manage cryptocurrencies",
	category: "Other",
	subcommands: [
		{
			name: "add",
			description: "Add your own coin for management",
			arguments: [
				{
					name: "coin",
					description: "The name of the coin",
					required: true,
				},
				{
					name: "username",
					description: "The username for the coin",
					required: true,
				},
				{
					name: "password",
					description: "The password of the coin",
					required: true,
				},
			]
		},
		{
			name: "buy",
			description: "Buy cryptocurrency",
			arguments: [
				{
					name: "coin",
					description: "The name of the coin",
					required: true,
				},
				{
					name: "amount",
					description: "The amount of coins you want to buy",
					required: true,
				},
				{
					name: "price",
					description: "The price per coin",
					required: true,
				},
				{
					name: "subwallet",
					description: "The username of the subwallet to use",
					required: true,
				},
			]
		},
		{
			name: "sell",
			description: "Sell cryptocurrency",
			arguments: [
				{
					name: "coin",
					description: "The name of the coin",
					required: true,
				},
				{
					name: "amount",
					description: "The amount of coins you want to sell",
					required: true,
				},
				{
					name: "price",
					description: "The price per coin",
					required: true,
				},
				{
					name: "subwallet",
					description: "The username of the subwallet to use",
					required: true,
				},
			]
		},
		{
			name: "edit",
			description: "Modify your coin's settings",
		},
		{
			name: "list",
			description: "List global cryptocurrencies",
		},
	]
});

type DBWalletType = { walletUser: string, walletPass: string; };
type DBCoinType = { coinName: string, coinUser: string, coinPass: string; };

command.funcs.getWallet = function (process) {
	const blockChain = requireLib("blockchain.so");
	if (!blockChain) return null;

	const data = FluxCore.raw.database.fetchOne("secrets", { walletUser: { $ne: "" } }) as DBWalletType;
	if (!data) {
		process.write(1, "It seems you don't have a wallet or it wasn't stored in the database yet");
		const username = userInput("Enter wallet username > ");
		const password = userInput("Enter wallet password > ", true);

		let result = blockChain.loginWallet(username, password);
		if (isType(result, "wallet")) {
			FluxCore.raw.database.insert("secrets", { walletUser: username, walletPass: password });
			return result;
		}

		result = blockChain.createWallet(username, password);
		if (!isType(result, "wallet")) {
			process.write(2, `Failed to create wallet: ${result}`);
			return null;
		}

		FluxCore.raw.database.insert("secrets", { walletUser: username, walletPass: password });
		return result;
	}

	const wallet = blockChain.loginWallet(data.walletUser, data.walletPass);
	if (!isType(wallet, "wallet")) {
		FluxCore.raw.database.remove("secrets", data);
		return this.getWallet(process);
	}

	return wallet;
};

command.funcs.getCoin = function (process) {
	const blockChain = requireLib("blockchain.so");
	if (!blockChain) return null;

	const coins = FluxCore.raw.database.fetch("secrets", { coinUser: { $ne: "" } }) as DBCoinType[];
	if (!coins.length) {
		process.write(1, "The coin's data wasn't saved in the database yet");

		const coinName = userInput("Enter coin name > ");
		if (!isType(blockChain.amountMined(coinName), "number")) {
			process.write(2, `Coin ${coinName} doesn't exist`);
			return null;
		}

		const username = userInput("Enter coin username > ");
		const password = userInput("Enter coin password > ");
		const result = blockChain.getCoin(coinName, username, password);
		if (!isType(result, "coin")) {
			process.write(2, `Failed to get the coin: ${result}`);
			return null;
		}

		FluxCore.raw.database.insert("secrets", { coinName, coinUser: username, coinPass: password });
		return result;
	}

	let selected = coins[0];
	if (coins.length > 1) {
		process.write(1, "You have multiple coins saved in the database");

		for (let i = 0; i < coins.length; i++) {
			process.write(1, `#${i + 1} ${coins[i].coinName}`);
		}

		while (true) {
			const input = userInput("Select which one to use > ").toInt();
			if (!isType(input, "number")) continue;
			if (coins.hasIndex(input - 1)) continue;

			selected = coins[input - 1];
			break;
		}
	}

	const coin = blockChain.getCoin(selected.coinName, selected.coinUser, selected.coinPass);
	if (!isType(coin, "coin")) {
		process.write(2, `Data for coin '${selected.coinName}' was invalid. Removing it from the database`);
		FluxCore.raw.database.remove("secrets", selected);
		return this.getCoin(process);
	}

	return coin;
};

// Add
command.subcommands[0].run = function (args, _options, process) {
	const data: DBCoinType = {
		coinName: args[0],
		coinUser: args[1],
		coinPass: args[2],
	};

	const blockChain = requireLib("blockchain.so");
	if (!blockChain)
		return EXIT_CODES.GENERAL_ERROR;

	const dbCoin = FluxCore.raw.database.fetchOne("secrets", data);
	const result = blockChain.getCoin(data.coinName, data.coinUser, data.coinPass);
	if (!isType(result, "coin")) {
		// Coin doesn't exist in the world so let's remove it from the db
		if (dbCoin) FluxCore.raw.database.remove("secrets", data);

		process.write(2, `Failed to add the coin: ${result}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (dbCoin) {
		process.write(1, `Coin ${data.coinName} is already in the database`);
		return EXIT_CODES.SUCCESS;
	}

	if (FluxCore.raw.database.insert("secrets", data)) {
		process.write(1, `<color=green>Coin ${data.coinName} added!`);
		return EXIT_CODES.SUCCESS;
	}

	return EXIT_CODES.GENERAL_ERROR;
};

// Buy
command.subcommands[1].run = function (args, _options, process) {
	const wallet = this.funcs.getWallet(process);
	if (!wallet) return EXIT_CODES.GENERAL_ERROR;

	const coinName = args[0];
	const buyAmount = args[1].toInt();
	const unitPrice = args[2].toInt();
	const subwallet = args[3];

	if (!isType(buyAmount, "number")) {
		process.write(2, `Buy amount is not a number`);
		return EXIT_CODES.MISUSE;
	}

	if (!isType(unitPrice, "number")) {
		process.write(2, `Unit price is not a number`);
		return EXIT_CODES.MISUSE;
	}

	const result = wallet.buyCoin(coinName, buyAmount, unitPrice, subwallet);
	if (isType(result, "string")) {
		process.write(2, `Failed to create purchase offer: ${result}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, "<color=green>Successfully created purchase offer!");
	return EXIT_CODES.SUCCESS;
};

// Sell
command.subcommands[2].run = function (args, _options, process) {
	const wallet = this.funcs.getWallet(process);
	if (!wallet) return EXIT_CODES.GENERAL_ERROR;

	const coinName = args[0];
	const sellAmount = args[1].toInt();
	const unitPrice = args[2].toInt();
	const subwallet = args[3];

	if (!isType(sellAmount, "number")) {
		process.write(2, `Sell amount is not a number`);
		return EXIT_CODES.MISUSE;
	}

	if (!isType(unitPrice, "number")) {
		process.write(2, `Unit price is not a number`);
		return EXIT_CODES.MISUSE;
	}

	const result = wallet.sellCoin(coinName, sellAmount, unitPrice, subwallet);
	if (isType(result, "string")) {
		process.write(2, `Failed to create sell offer: ${result}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, "<color=green>Successfully created sell offer!");
	return EXIT_CODES.SUCCESS;
};

// Edit
command.subcommands[3].run = function (_args, _options, process) {
	const coin = this.funcs.getCoin(process);
	if (!coin) return EXIT_CODES.GENERAL_ERROR;

	const address = coin.getAddress();
	const newAddress = userInput(`Set address (Current: ${address}) > `);
	if (newAddress && isValidIp(newAddress)) {
		const result = coin.setAddress(newAddress);
		if (isType(result, "string")) process.write(2, result);
	}

	const interval = coin.getCycleMining();
	const newInterval = userInput(`Set hours per mining cycle (Current: ${interval}) > `).toInt();
	if (newInterval) {
		if (isType(newInterval, "number")) {
			const result = coin.setCycleMining(newInterval);
			if (isType(result, "string")) process.write(2, result);
		}
		else {
			process.write(2, `Given input '${newInterval}' is not a number`);
		}
	}

	const reward = coin.getReward();
	const newReward = userInput(`Set coin reward for each cycle (Current: ${reward}) > `).toInt();
	if (newReward) {
		if (isType(newReward, "number")) {
			const result = coin.setReward(newReward);
			if (isType(result, "string")) process.write(2, result);
		}
		else {
			process.write(2, `Given input '${newReward}' is not a number`);
		}
	}

	return EXIT_CODES.SUCCESS;
};

// List
command.subcommands[4].run = function (_args, _options, process) {
	const blockChain = requireLib("blockchain.so");
	if (!blockChain)
		return EXIT_CODES.GENERAL_ERROR;

	if (!getShell().hostComputer.isNetworkActive()) {
		process.write(2, "No internet connection");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const wallet = this.funcs.getWallet(process);
	if (!wallet) return EXIT_CODES.GENERAL_ERROR;

	const globalCoins = wallet.listGlobalCoins();
	if (isType(globalCoins, "string")) {
		process.write(2, globalCoins);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const output = ["COIN PRICE MINED"];
	for (const coinName of globalCoins) {
		const price = blockChain.coinPrice(coinName) as number;
		const mined = blockChain.amountMined(coinName) as number;
		output.push(`${coinName} ${price} ${mined}`);
	}

	process.write(1, formatColumns(output.join("\n")));
	return EXIT_CODES.SUCCESS;
};