import { Command, type ExitCodeType } from "../shell/Command";
import { EXIT_CODES, FluxShell } from "../shell/FluxShell";
import type { Process } from "../shell/Process";

interface Ext {
	showCommandHelp(commandName: string, command: Command | null, process: Process): ExitCodeType;
	showTips(process: Process): void;
}

const command = new Command<Ext>({
	name: "help",
	description: "Shows available commands",
	category: "Other",
	options: [],
	arguments: [
		{
			name: "command",
			description: "The command to show help for",
			required: false,
		},
	]
});

command.funcs.showCommandHelp = function (commandName, command, process) {
	const parts = commandName.split(" ");
	if (!command) {
		const shellCommand = FluxShell.raw.commands[parts[0]];
		if (!shellCommand) {
			process.write(1, `Unknown help topic: ${commandName}`);
			return EXIT_CODES.GENERAL_ERROR;
		}

		command = shellCommand;
	}

	if (command.subcommands.length && parts.length > 1) {
		parts.shift();
		for (const subcommand of command.subcommands) {
			if (subcommand.name === parts[0]) {
				return this.showCommandHelp(parts.join(" "), subcommand, process);
			}
		}

		process.write(1, `Subcommand '${parts[0]}' not found for command '${command.fullName}'`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	command.showHelp(process);
	return EXIT_CODES.SUCCESS;
};

command.funcs.showTips = function (process) {
	process.write(1, [
		"<b>Standard file descriptors:",
		"	0: stdin (input)",
		"	1: stdout (output)",
		"	2: stderr (error output)",
		"",
		"<b>Redirection operators:",
		"	<b>Syntax				Meaning",
		"	cmd > file			Redirect stdout to file (overwrite)",
		"	cmd >> file			Redirect stdout to file (append)",
		"	cmd < file			Redirect stdin from file",
		"	cmd 2> file			Redirect stderr to file",
		"	cmd > file 2>&1			Redirect stdout to file, stderr to stdout (both to file)",
		"	cmd &> file			Same as above",
		"	cmd >& file			Same as above",
		"",
		"<b>Pipes:",
		"	<b>Syntax				Meaning",
		"	cmd1 | cmd2			Puts the output of cmd1 to cmd2 for further processing",
		"<b>Here-documents (heredocs):",
		"	<b>Syntax				Meaning",
		"	cmd << EOF			Feed multiline input into a command until delimiter is met",
		"",
		"<b>Other tips:",
		"	Redirections are applied in the order written, and order matters.",
		"",
		"	In tricky cases use -- to separate options from arguments (e.g., rm -- -file.txt)",
	]);
};

command.run = function (args, _options, process) {
	if (args.length) {
		if (args[0] === "tips") {
			this.funcs.showTips(process);
			return EXIT_CODES.SUCCESS;
		}

		return this.funcs.showCommandHelp(args.join(" "), null, process);
	}

	const categoryCommands: Record<string, Command[]> = {};

	for (const commandName of Object.keys(FluxShell.raw.commands)) {
		const command = FluxShell.raw.commands[commandName];
		if (!(command.category in categoryCommands))
			categoryCommands[command.category] = [];

		categoryCommands[command.category].push(command);
	}

	process.write(1, "<size=2em><b><u>Available Commands");

	for (const category of Object.keys(categoryCommands)) {
		let indent = "  ";
		if (category === "None")
			indent = "";
		else
			process.write(1, `${indent}<size=1.5em><b><u>${category}`);
	
		for (const command of categoryCommands[category]) {
			process.write(1, `${indent}  <b>%-12s</b> %40`.format(command.name, command.description));
		}
	}

	process.write(1, "\\nUse 'help tips' to see some general tips about redirections and command piping");

	return EXIT_CODES.SUCCESS;
};
