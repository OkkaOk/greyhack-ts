import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

const command = new Command({
	name: "wifi",
	description: "Gets you a free wifi",
	category: "Hacking",
	arguments: [
		{
			name: "essid",
			description: "The name of the wifi you want to crack",
			required: false,
		}
	],
	requirements: {
		hasShell: true
	}
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	const crypto = session.crypto;

	if (!crypto) {
		process.write(2, "This session doesn't have cryptools loaded");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const airmonRes = crypto.airmon("start", "wlan0");
	if (isType(airmonRes, "string")) {
		process.write(2, airmonRes);
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (!airmonRes) {
		process.write(2, "Failed to start monitoring mode");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const networks = session.computer.wifiNetworks("wlan0") ?? [];
	const result: { bssid: string, pwr: number, essid: string; }[] = [];
	for (const network of networks) {
		const parsedItem = network.split(" ");
		result.push({
			bssid: parsedItem[0],
			pwr: slice(parsedItem[1], 0, -1).toInt() as number,
			essid: parsedItem[2],
		});
	}

	result.sort("pwr", false);
	let chosen = result[0];

	if (args.length) {
		for (const net of result) {
			if (net.essid !== args[0]) continue;

			chosen = net;
			break;
		}
	}

	if (session.computer.isNetworkActive() && getRouter() && getRouter()!.essidName === chosen.essid) {
		process.write(1, "You're already in the wifi " + chosen.essid);
		return EXIT_CODES.SUCCESS;
	}

	const aireplayRes = crypto.aireplay(chosen.bssid, chosen.essid, 300000 / (chosen.pwr + 15));
	crypto.airmon("stop", "wlan0");
	if (isType(aireplayRes, "string")) {
		process.write(2, aireplayRes);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const capFile = session.computer.file(session.workingDir + "/file.cap");
	if (!capFile) {
		process.write(2, "Failed to create .cap file in the current folder");
		return EXIT_CODES.SUCCESS;
	}

	const wifiPassword = crypto.aircrack(session.workingDir + "/file.cap");
	if (wifiPassword === null) {
		process.write(2, "Failed to crack wifi password");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const connected = session.computer.connectWifi("wlan0", chosen.bssid, chosen.essid, wifiPassword);
	if (isType(connected, "string")) {
		process.write(2, connected);
		return EXIT_CODES.GENERAL_ERROR;
	}

	capFile.delete();

	process.write(1, `Connected to wifi: ${chosen.essid} (${chosen.bssid})`);
	return EXIT_CODES.SUCCESS;
};