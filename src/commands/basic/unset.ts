import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES, FluxShell } from "../../shell/FluxShell";

const command = new Command({
	name: "unset",
	description: "Unsets environment variables",
	category: "System Management",
	arguments: [
		{
			name: "var_name",
			description: "The name of the environment variable",
			required: true
		}
	],
	options: [
		{
			name: "all",
			flags: ["-a", "--all"],
			description: "Remove all ENV variables",
			overrideArgs: true
		}
	]
});

command.run = function (args, options, process) {
	if ("all" in options) {
		FluxShell.raw.env = {};

		FluxCore.raw.database.remove("env", {});
		return EXIT_CODES.SUCCESS;
	}

	const variable = args[0];
	if (!FluxShell.raw.env[variable]) {
		process.write(2, `ENV variable $${variable} doesn't exist!`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	Object.remove(FluxShell.raw.env, variable);
	FluxCore.raw.database.remove("env", { key: variable });

	process.write(1, `ENV variable $${variable} removed!`);
	
	return EXIT_CODES.SUCCESS;
};