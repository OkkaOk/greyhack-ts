import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "sort",
	description: "Sorts the contents of a file or stdin to stdout",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "file",
			description: "The path(s) of the file(s) to sort",
			required: true,
			rest: true,
		},
	],
	options: [
		{
			name: "output",
			flags: ["-o", "--output"],
			description: "Specifies an output file for sorted data",
			type: "string"
		},
		{
			name: "reverse",
			flags: ["-r", "--reverse"],
			description: "Sorts data in reverse order",
		},
		{
			name: "unique",
			flags: ["-u", "--unique"],
			description: "Removes duplicate lines",
		},
		{
			name: "numerical",
			flags: ["-n", "--numerical"],
			description: "Sorts data numerically (treats data as numbers)",
		},
	]
});

command.run = function (args, options, process) {
	let lines: (string | number)[] = [];

	const session = FluxCore.currSession();
	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	if (!args.length) {
		lines = process.read(0);
	}

	for (const filePath of args) {
		if (filePath === "-") {
			lines = lines.concat(process.read(0));
			continue;
		}

		const absPath = session.resolvePath(filePath);
		const fd = process.open(absPath, "r");
		if (!fd) {
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		lines = lines.concat(process.read(fd));
		process.close(fd);
	}

	if (!lines.length) {
		process.write(2, "No lines to sort");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const ascending = !("reverse" in options);

	if ("numerical" in options) {
		for (let i = 0; i < lines.length; i++)
			lines[i] = (lines[i] as string).toInt();
	}

	lines.sort(null, ascending);

	if ("unique" in options) {
		for (let i = lines.length - 1; i >= 1; i--) {
			for (let j = i - 1; j >= 0; j--) {
				if (lines[i] === lines[j]) {
					lines.remove(i);
					break;
				}
			}
		}
	}

	if ("output" in options) {
		for (const output of options["output"] as string[]) {
			const filePath = session.resolvePath(output);
			const fd = process.open(filePath, "w");
			if (!fd) {
				exitCode = EXIT_CODES.GENERAL_ERROR;
				continue;
			}

			process.write(fd, lines as string[]);
			process.close(fd);
		}
	}

	process.write(1, lines as string[]);
	return exitCode;
};