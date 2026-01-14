import { Command } from "../shell/Command";
import { EXIT_CODES, FluxShell } from "../shell/FluxShell";

const command = new Command({
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


command.run = function (args, _options, process) {
	if (args.length) {
		if (args[0] === "tips") {
			// TODO: this
		}

		return EXIT_CODES.SUCCESS;
	}

	const categoryCommands: Record<string, Command[]> = {};

	for (const commandName of FluxShell.raw.commands.indexes()) {
		const command = FluxShell.raw.commands[commandName as string];
		if (!categoryCommands.hasIndex(command.category))
			categoryCommands[command.category] = [];

		categoryCommands[command.category].push(command);
	}

	process.write(1, "<size=2em><b><u>Available Commands");

	for (const category of Object.keys(categoryCommands)) {
		process.write(1, `  <size=1.5em><b><u>${category}`);
		for (const command of categoryCommands[category]) {
			process.write(1, "    <b>%-12s</b> %40".format(command.name, command.description));
		}
	}

	process.write(1, "\nUse 'help tips' to see some general tips about redirections and command piping");

	return EXIT_CODES.SUCCESS;
};
