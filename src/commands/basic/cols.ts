import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "cols",
	description: "Selects columns from input",
	category: "Data Operations",
	examples: [
		"cols 0 2",
		"ps | cols 1 4"
	],
	arguments: [
		{
			name: "columns",
			description: "Columns to select. Index starts from 0",
			required: true,
			rest: true,
		}
	],
	options: [
		{
			name: "file",
			flags: ["-f", "--file"],
			description: "The path of the file to read lines from",
			type: "string",
		},
		{
			name: "delimiter",
			flags: ["-d", "--delimiter"],
			description: "Items from input are separated by the given character instead of whitespace",
			type: "string",
		}
	]
});

command.run = function (args, options, process) {
	let lines = process.read(0);

	if ("file" in options) {
		const session = FluxCore.currSession();
		for (const file of options["file"] as string[]) {
			const absPath = session.resolvePath(file);
			const fd = process.open(absPath, "r");
			if (!fd) return EXIT_CODES.GENERAL_ERROR;

			lines = lines.concat(process.read(fd));
		}
	}

	let splitPattern = "\\s+";
	if ("delimiter" in options) {
		splitPattern = options["delimiter"][0] as string;
	}

	let exitCode: ExitCodeType = EXIT_CODES.GENERAL_ERROR;
	for (const line of lines) {
		const fields = line.split(splitPattern);

		const selected: string[] = [];
		for (const arg of args) {
			const col = arg.toInt();
			if (!isType(col, "number")) continue;
			if (col < 0 || col >= fields.length) continue;

			selected.push(fields[col]!);
		}

		if (!selected.length)
			continue;

		exitCode = EXIT_CODES.SUCCESS;
		process.write(1, selected.join(" "));
	}

	return exitCode;
};