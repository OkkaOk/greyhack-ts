import { isValidMd5 } from "../../utils/libokka";
import { FluxCore } from "../core/FluxCore";
import { Command, type ExitCodeType } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

const command = new Command({
	name: "crack",
	description: "Cracks the given password hash",
	category: "Hacking",
	acceptsStdin: true,
	arguments: [
		{
			name: "hash",
			description: "The hash to crack",
			required: true,
		}
	]
});

command.run = function (args, _options, process) {
	const lines = args.concat(process.read(0));
	if (!lines.length) {
		process.write(2, "No hashes given");
		return EXIT_CODES.MISUSE;
	}

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const line of lines) {
		if (!line) continue;

		let account = ""
		let password = line;

		if (line.indexOf(":") != null) {
			const parts = line.split(":");
			password = parts[1];
			account = parts[0];
		}

		if (isValidMd5(password)) {
			const deciphered = FluxCore.decipher(password);
			if (deciphered) password = deciphered;
		}
		else {
			process.write(2, `Invalid hash: ${line}`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		const parts = [password];
		if (account) parts.insert(0, account);

		process.write(1, parts.join(" > "));
	}

	return exitCode;
};