import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";
import { basename } from "../../utils/libokka";

const command = new Command({
	name: "tail",
	description: "View the last few lines of the file",
	category: "Data Operations",
	arguments: [
		{
			name: "file",
			description: "The path of the file to view",
			required: false,
			rest: true,
		}
	],
	options: [
		{
			name: "lines",
			flags: ["-n", "--lines"],
			description: "The amount of lines to show",
			type: "string"
		},
		{
			name: "quiet",
			flags: ["-q", "--quiet"],
			description: "Don't print headers for files"
		},
	]
});

command.run = function (args, options, process) {
	const session = FluxCore.currSession();

	let lineCount: string | number = 10;
	if ("lines" in options)
		lineCount = (options["lines"][0] as string).toInt()

	if (!isType(lineCount, "number")) {
		process.write(2, "Invalid line count");
		return EXIT_CODES.MISUSE;
	}

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;
	const data: { source: string, lines: string[] }[] = [];
	if (!args.length) {
		const stdinLines = process.read(0);
		if (stdinLines.length)
			data.push({ source: "(stdin)", lines: stdinLines });
	}
	
	for (const filePath of args) {
		if (filePath === "-") {
			const stdinLines = process.read(0);
			if (stdinLines.length)
				data.push({ source: "(stdin)", lines: stdinLines });
			continue;
		}

		const absPath = session.resolvePath(filePath);
		const fileName = basename(absPath);
		const fd = process.open(absPath, "r");
		if (!fd) {
			exitCode = EXIT_CODES.MISUSE;
			continue;
		}

		data.push({ source: fileName, lines: process.read(fd) });
		process.close(fd);
	}

	if (!data.length)
		return exitCode;

	const showNames = data.length >= 2 && !("quiet" in options);
	for (let i = 0; i < data.length; i++) {
		if (showNames)
			process.write(1, `==> ${data[i].source} <==`);

		if (!data[i].lines.length || lineCount <= 0)
			continue;

		const startIndex = Math.max(0, data[i].lines.length - lineCount);

		for (let j = startIndex; j < data[i].lines.length; j++) {
			process.write(1, data[i].lines[j]);
		}

		if (showNames && i + 1 < data.length)
			process.write(1, "");
	}

	return exitCode;
};