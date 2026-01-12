import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import { formatColumnsf } from "../utils/libokka";

const command = new Command({
	name: "print",
	description: "Prints the collected data on the specified network",
	category: "Hacking",
	arguments: [
		{
			name: "public_ip",
			description: "The public IP of the network. Defaults to current network",
			required: false,
		},
	]
});


command.run = function (args, _options, process) {
	let ip = FluxCore.currSession().publicIp;
	if (args.length)
		ip = args[0]!;

	const data = FluxCore.raw.data[ip];
	if (!data) {
		process.write(1, `No data found for network with ip: ${ip}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (Object.keys(data.mails).length) {
		const lines = ["", "MAIL PASSWORD"];
		for (const mail of Object.keys(data.mails)) {
			lines.push(`${mail} ${data.mails[mail]}`);
		}

		process.write(1, formatColumnsf(lines, "left", false));
	}

	if (Object.keys(data.users).length) {
		const lines = ["", "USER PASSWORD"];
		for (const user of Object.keys(data.users)) {
			lines.push(`${user} ${data.users[user]}`);
		}

		process.write(1, formatColumnsf(lines, "left", false));
	}

	if (Object.keys(data.banks).length) {
		const lines = ["", "BANK-ACCOUNT PASSWORD"];
		for (const bank of Object.keys(data.banks)) {
			lines.push(`${bank} ${data.banks[bank]}`);
		}

		process.write(1, formatColumnsf(lines, "left", false));
	}

	return EXIT_CODES.SUCCESS;
};
