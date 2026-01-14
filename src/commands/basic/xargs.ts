import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES, FluxShell } from "../../shell/FluxShell";

const command = new Command({
	name: "xargs",
	description: "Run a command with arguments read from input",
	category: "Data Operations",
	arguments: [
		{
			name: "command",
			description: "The command to run",
			required: true,
		},
		{
			name: "INITIAL-ARGS",
			description: "The initial arguments for the command",
			required: false,
			rest: true,
		},
	],
	options: [
		{
			name: "max-args",
			flags: ["-n", "--max-args"],
			description: "Use at most the given amount of arguments per command line",
			type: "number"
		},
		{
			name: "delimiter",
			flags: ["-d", "--delimiter"],
			description: "Items from input are separated by the given character. Overrides default tokenization",
			type: "string"
		},
		{
			name: "replace",
			flags: ["-I", "--replace"],
			description: "Replace the given value in INITIAL-ARGS with args read from input",
			type: "string"
		}
	]
});

command.run = function (args, options, process) {
	const lines = process.read(0);

	// We need to tokenize this because args[0] might be a subcommand like "session use"
	const commandTokens = FluxShell.tokenize(args[0]);
	const cmd = FluxShell.getCommand(commandTokens[0], slice(commandTokens, 1));
	if (!cmd.valid) {
		process.write(2, `Command ${args[0]} doesn't exist`);
		return EXIT_CODES.CMD_NOT_FOUND;
	}

	let maxArgs: number | null = null;
	if ("max-args" in options) maxArgs = options["max-args"][0] as number;

	let delimiter: string | null = null;
	if ("delimiter" in options) delimiter = options["delimiter"][0] as string;

	const initialArgs = slice(args, 1);

	function replaceArgs(initial: string[], line: string, replaceKey: string) {
		const newArgs: string[] = [];
		for (const arg of initial) {
			const index = arg.indexOf(replaceKey);
			if (index === null) {
				newArgs.push(arg);
				continue;
			}

			newArgs.push(arg.replace(replaceKey, line));
		}

		return newArgs;
	}

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const line of lines) {
		let lineArgs: string[] = [];
		if (delimiter)
			lineArgs = lineArgs.concat(line.split(delimiter));
		else
			lineArgs = lineArgs.concat(FluxShell.tokenize(line));

		let commandArgs = initialArgs;
		if ("replace" in options)
			commandArgs = replaceArgs(initialArgs, lineArgs.join(" "), options["replace"][0] as string)
		else
			commandArgs = commandArgs.concat(lineArgs);

		if (maxArgs !== null)
			commandArgs = slice(commandArgs, 0, maxArgs);

		const child = process.clone();
		child.name = cmd.fullName;

		const cmdExitCode = FluxShell.runCommand(cmd, commandArgs, child);
		if (cmdExitCode >= 1 && cmdExitCode <= 125 && exitCode === EXIT_CODES.SUCCESS)
			exitCode = EXIT_CODES.CMD_EXEC_FAIL;
	}

	return exitCode;
};