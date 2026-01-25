import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES, FluxShell } from "../../shell/FluxShell";

const command = new Command({
	name: "unalias",
	description: "Remove an alias",
	category: "System Management",
	arguments: [
		{
			name: "alias",
			description: "The alias you want to remove",
			required: true
		}
	],
	options: [
		{
			name: "all",
			flags: ["-a", "--all"],
			description: "Remove all aliases",
			overrideArgs: true
		}
	]
});

command.run = function (args, options, process) {
	if ("all" in options) {
		FluxShell.raw.aliases = {};

		FluxCore.raw.database.remove("aliases", {});
		return EXIT_CODES.SUCCESS;
	}

	const alias = args[0];
	if (!FluxShell.raw.aliases[alias]) {
		process.write(2, `Alias '${alias}' doesn't exist!`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	Object.remove(FluxShell.raw.aliases, alias);
	FluxCore.raw.database.remove("aliases", { key: alias });

	process.write(1, `Alias '${alias}' removed!`);
	
	return EXIT_CODES.SUCCESS;
};