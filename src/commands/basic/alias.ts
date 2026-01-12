import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES, FluxShell } from "../../shell/FluxShell";
import { formatColumnsf } from "../../utils/libokka";

const command = new Command({
	name: "alias",
	description: "Create aliases",
	category: "System Management",
	arguments: [
		{
			name: "NAME[=VALUE]",
			description: "The name and value of the alias",
			required: false,
		}
	],
	options: [
		{
			name: "print",
			flags: ["-p"],
			description: "Outputs a list of all the active aliases in a reusable format"
		},
		{
			name: "temporary",
			flags: ["-t", "--temporary"],
			description: "The alias isn't saved to the db"
		}
	]
});

command.run = function (args, options, process) {
	function printAliases(strFormat: string) {
		if (!FluxShell.raw.aliases.size) {
			process.write(1, "No aliases exist!");
			return EXIT_CODES.SUCCESS;
		}

		process.write(1, "Active aliases:");
		const out: string[] = [];
		for (const alias of FluxShell.raw.aliases.indexes<string>()) {
			out.push(strFormat.format(alias, FluxShell.raw.aliases[alias]!.replace(" ", "§")));
		}

		process.write(1, formatColumnsf(out, "left", false, { "§": " " }));
		return EXIT_CODES.SUCCESS;
	}

	if ("print" in options) return printAliases(`§§%s="%s"`);

	const aliasStrings = args.concat(process.read(0));
	if (!aliasStrings.length) return printAliases(" §§%s %s");

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const aliasStr of aliasStrings) {
		const eqIndex = aliasStr.indexOf("=");
		if (eqIndex === null) {
			if (FluxShell.raw.aliases[aliasStr]) {
				process.write(1, `alias ${aliasStr}='${FluxShell.raw.aliases[aliasStr]}'`);
				continue;
			}

			process.write(2, `Alias ${aliasStr} not found`);
			continue;
		}

		const alias = slice(aliasStr, 0, eqIndex);
		const value = slice(aliasStr, eqIndex + 1);

		if (alias.split(" ").length > 1) {
			process.write(2, `Invalid alias name: '${alias}'`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		process.write(1, `Set ${alias.color("green")} to ${value.color("green")}`);
		FluxShell.raw.aliases[alias] = value;

		if (!("temporary" in options)) {
			FluxCore.raw.database.insert("aliases", { key: alias, value });
		}
	}

	return exitCode;
};