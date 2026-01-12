import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "echo",
	description: "Write text to standard output",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "text",
			description: "Text to write",
			required: true,
			rest: true,
		}
	],
	options: [
		{
			name: "no-new-line",
			flags: ["-n"],
			description: "Do not append new line",
		}
	]
});

command.run = function (args, options, process) {
	const omitNewLine = "no-new-line" in options;
	process.write(1, args.join(" "), omitNewLine);

	return EXIT_CODES.SUCCESS;
};