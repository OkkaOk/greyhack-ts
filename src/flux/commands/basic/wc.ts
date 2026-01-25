import { basename, formatColumnsf } from "../../../utils/libokka";
import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "wc",
	description: "Counts things from inputs",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "file",
			description: "The path of the file to count from",
			required: true,
			rest: true
		}
	],
	options: [
		{
			name: "lines",
			flags: ["-l", "--lines"],
			description: "Counts the number of lines",
		},
		{
			name: "words",
			flags: ["-w", "--words"],
			description: "Counts the number of words",
		},
		{
			name: "characters",
			flags: ["-m"],
			description: "Counts the number of characters",
		},
		{
			name: "longest",
			flags: ["-L", "--longest"],
			description: "Prints the length of the longest line",
		},
	]
});

command.run = function (args, options, process) {
	if (!Object.size(options)) {
		(options as any).lines = true;
		(options as any).words = true;
		(options as any).characters = true;
	}

	const session = FluxCore.currSession();
	const data: { source: string, lines: string[]; }[] = [];
	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

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
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		data.push({ source: fileName.replace(" ", "§"), lines: process.read(fd) });
		process.close(fd);
	}

	function getValue(initial: string | number, opt: string) {
		if (!(opt in options)) return "";
		return " " + initial;
	}

	const output: string[] = [];
	let totalLineCount = 0;
	let totalWordCount = 0;
	let totalCharCount = 0;
	let finalLongest = 0;

	output.push("%s §%s%s%s%s".format(
		"§",
		getValue("lines", "lines"),
		getValue("words", "words"),
		getValue("chars", "characters"),
		getValue("longest", "longest"),
	));

	for (const obj of data) {
		const lineCount = obj.lines.length;
		let wordCount = 0;
		let charCount = 0;
		let longest = 0;

		for (const line of obj.lines) {
			if (!line) continue;
			const lineLength = line.length;

			wordCount += Object.size(line.matches(/\w+/));
			charCount += lineLength;
			if (lineLength > longest) longest = lineLength;
		}

		output.push("%s >%s%s%s%s".format(
			obj.source,
			getValue(lineCount, "lines"),
			getValue(wordCount, "words"),
			getValue(charCount, "characters"),
			getValue(longest, "longest"),
		));

		totalLineCount += lineCount;
		totalWordCount += wordCount;
		totalCharCount += charCount;
		if (longest > finalLongest) finalLongest = longest;
	}

	if (data.length >= 2) {
		output.push("%s >%s%s%s%s".format(
			"Total",
			getValue(totalLineCount, "lines"),
			getValue(totalWordCount, "words"),
			getValue(totalCharCount, "characters"),
			getValue(finalLongest, "longest"),
		));
	}

	process.write(1, formatColumnsf(output, "left", false, { "§": " " }));

	return exitCode;
};