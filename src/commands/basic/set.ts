import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES, FluxShell } from "../../shell/FluxShell";
import { formatColumnsf } from "../../utils/libokka";

const command = new Command({
	name: "set",
	description: "Create a range of numbers",
	category: "Data Operations",
	examples: [`set HACKSHOP_IP="1.1.1.1"`],
	arguments: [
		{
			name: "NAME=VALUE",
			description: "The name and value of the environment variable",
			required: true,
			rest: true
		},
	],
	options: [
		{
			name: "print",
			flags: ["-p"],
			description: `Outputs a list of all environment variables in a reusable format`,
			overrideArgs: true
		},
	]
});

command.run = function (args, options, process) {
	function printVariables(strFormat: string) {
		if (!FluxShell.raw.env.size) {
			process.write(1, "No env variables set!");
			return EXIT_CODES.SUCCESS;
		}

		process.write(1, "<b>ENV Variables:");
		const out: string[] = [];
		for (const variable of FluxShell.raw.env.indexes<string>()) {
			out.push(strFormat.format(variable, FluxShell.raw.env[variable].replace(" ", "§")));
		}

		process.write(1, formatColumnsf(out, "left", false, { "§": " " }));
		return EXIT_CODES.SUCCESS;
	}

	if ("print" in options) return printVariables(`§§%s="%s"`);

	const envStrings = args.concat(process.read(0));
	if (!envStrings.length) return printVariables(" §§%s %s");

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const envString of envStrings) {
		const eqIndex = envString.indexOf("=");
		if (eqIndex === null || envString.length === eqIndex + 1) {
			process.write(2, `No value given for ${envString}`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		const variable = slice(envString, 0, eqIndex);
		const value = slice(envString, eqIndex + 1);

		if (variable.split(" ").length > 1) {
			process.write(2, `Invalid variable name: '${variable}'`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		process.write(1, `Set ${variable.color("green")} to ${value.color("green")}`);
		FluxShell.raw.env[variable] = value;
		FluxCore.raw.database.insert("env", { key: variable, value });
	}

	return exitCode;
};