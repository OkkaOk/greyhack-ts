import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "grep",
	description: "Filters lines that matches a pattern",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "pattern",
			description: "The pattern you want to search for",
			required: true,
		},
		{
			name: "file",
			description: "The path of the file to search from",
			required: false,
			rest: true,
		}
	],
	options: [
		{
			name: "only",
			flags: ["-o", "--only"],
			description: "Prints only the matched parts instead of the whole line",
		},
		{
			name: "invert",
			flags: ["-v", "--invert"],
			description: "Prints lines that don't match the pattern",
		},
		{
			name: "ignore_case",
			flags: ["-i", "--ignore-case"],
			description: "Ignore case for matching",
		}
	]
});

command.run = function (args, options, process) {
	if (!args.length) {
		process.write(2, "No pattern provided for grep");
		return EXIT_CODES.MISUSE;
	}

	const session = FluxCore.currSession();
	const data: { source: string, lines: string[] }[] = [];
	const pattern = args[0]!;
	const files = slice(args, 1);

	if (!files.length) {
		const stdinLines = process.read(0);
		if (stdinLines.length) {
			data.push({ source: "(stdin)", lines: stdinLines });
		}
	}

	for (const filePath of files) {
		if (filePath === "-") {
			const stdinLines = process.read(0);
			if (stdinLines.length) {
				data.push({ source: "(stdin)", lines: stdinLines });
			}
			continue;
		}

		const absPath = session.resolvePath(filePath);
		const fileName = absPath.split("/")[-1]!;
		const fd = process.open(absPath, "r");
		if (!fd) continue;

		data.push({ source: fileName, lines: process.read(fd) });
		process.close(fd);
	}

	const inverted = "invert" in options;

	let regexMode = "none";
	if ("ignore_case" in options)
		regexMode = "i";

	const showNames = data.length >= 2;

	function getOutput(source: string, input: string) {
		if (!showNames) return input;
		return `${source} > ${input}`;
	}

	let exitCode: ExitCodeType = EXIT_CODES.GENERAL_ERROR;

	for (const obj of data) {
		for (const line of obj.lines) {
			const lineMatches = line.matches(pattern, regexMode).values();
			if (lineMatches.length && inverted) continue;
			if (!lineMatches.length && !inverted) continue;

			if ("only" in options) {
				for (const match of lineMatches) {
					process.write(1, getOutput(obj.source, match));
				}
			}
			else {
				process.write(1, getOutput(obj.source, line));
			}

			exitCode = EXIT_CODES.SUCCESS;
		}
	}

	return exitCode;
};