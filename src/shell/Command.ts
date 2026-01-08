import { EXIT_CODES } from "./FluxShell";
import type { Process } from "./Process";

type CommandRunRequirement = "hasShell";
type CommandCategory = "Hacking" | "Networking" | "System Management" | "Data Operations" | "Other";

type SubcommandData = {
	name: string;
	description: string;
	category?: CommandCategory;
	arguments?: CommandArgument[];
	options?: CommandOption[];
	subcommands?: SubcommandData[];
	requirements?: Record<CommandRunRequirement, boolean> | null;
	/** Command can be run even though args count is insufficient */
	acceptsStdin?: boolean;
	hidden?: boolean;
	examples?: string[];
};

type CommandData = {
	category: CommandCategory;
	nonFlux?: boolean;
} & SubcommandData;

type CommandArgument = {
	name: string;
	description: string;
	required?: boolean;
	rest?: boolean;
};

type CommandOption = {
	name: string;
	flags: [string] | [string, string];
	description: string;
	type?: "string" | "number" | "boolean";
	/** Allow command to bypass arg count requirement */
	overrideArgs?: boolean;
};

type ExitCodeType = typeof EXIT_CODES[keyof typeof EXIT_CODES];

type RunFlags = Record<string, (string | number | boolean)[]>;

export class Command<T extends object = never> implements CommandData {
	classID = "command";
	name: string;
	fullName: string;
	description: string;
	category: CommandCategory;
	arguments: CommandArgument[];
	options: CommandOption[];
	subcommands: Command[];
	requirements: Record<CommandRunRequirement, boolean> | null;
	valid: boolean;
	requiredArgCount: number;
	hidden: boolean = false;
	acceptsStdin: boolean = false;
	examples: string[];

	isFluxCommand: boolean;
	file: GreyHack.File | null = null;

	run?: (args: string[], options: RunFlags, process: Process) => ExitCodeType;
	funcs: T;

	constructor(data: CommandData) {
		this.subcommands = [];
		data = this.fill(data);

		this.name = data.name;
		this.fullName = data.name;
		this.description = data.description;
		this.category = data.category;
		this.arguments = data.arguments!;
		this.options = data.options!;
		this.examples = [];
		this.funcs = {} as any;

		this.requirements = null;
		if (data.requirements)
			this.requirements = data.requirements;

		if (data.nonFlux) {
			this.valid = false; // It gets validated outside after the checks pass
			this.isFluxCommand = false;
		}
		else {
			this.valid = true;
			this.isFluxCommand = true;
		}

		if (data.acceptsStdin)
			this.acceptsStdin = true;

		if (data.hidden)
			this.hidden = true;

		if (data.examples && data.examples.length)
			this.examples = data.examples;

		this.requiredArgCount = 0;
		for (const arg of this.arguments) {
			if (arg.required) {
				this.requiredArgCount++;
			}
		}

		let hasHelpOption = false;
		for (const option of this.options) {
			if (option.name != "help") continue;
			hasHelpOption = true;
			break;
		}

		if (!hasHelpOption) {
			this.options.push({
				name: "help",
				flags: ["-h", "--help"],
				description: "Shows help for this command",
			});
		}


		if (this.isFluxCommand) {
			getCustomObject()["fluxShell"].commands[this.name] = this;
		}
	}

	/** Extracts the options from the arguments.
	 * 
	 * Modifies the arguments array and returns the options used.
	 * 
	 * Returns null if options are invalid
	 */
	extractOptions(args: string[], process: Process): RunFlags | null {
		const options: RunFlags = {};

		let optionEndIndex = args.length - 1;
		const endI = args.indexOf("--");
		if (endI !== null) {
			optionEndIndex = endI - 1;
			args.remove(endI);
		}

		if (optionEndIndex <= -1) return options;

		for (let i = optionEndIndex; i >= 0; i--) {
			const arg = args[i];
			if (!arg || arg[0] != "-") continue;

			let nextArg: string | null = null;
			if (args.hasIndex(i + 1)) {
				nextArg = args[i + 1]!;
			}

			const nextArgNumeric = nextArg && getType(nextArg.toInt()) === "number";
			let option = this.getOptionForFlag(arg);

			if (option && option.overrideArgs) {
				options["overrideArgs"] = [true];
			}

			const takesValue = option && option.type != "boolean";

			// Handles long flags: --key=value or --key value or --key
			// also single short flags: -k=value or -k value or -k
			if (option) {
				if (!options.hasIndex(option.name)) options[option.name] = [];

				let value = "";
				if (arg.indexOf("=") !== null) {
					value = slice(arg, arg.indexOf("=")! + 1);
				}
				else if (takesValue && nextArg && (nextArg[0] != "-" || (nextArgNumeric && option.type === "number"))) {
					value = nextArg;
					args.remove(i + 1);
				}

				if (takesValue && !value) {
					process.write(2, "Option requires an argument: " + arg);
					return null;
				}

				options[option.name]!.push(value.toInt());
				args.remove(i);
				continue;
			}

			// Combined short flags: -abc -a, -b, -c (no values allowed)
			let endIndex = arg.length - 1;
			if (arg.indexOf("=") != null) endIndex = arg.indexOf("=")!;
			if (endIndex <= 0) continue;
			let found = false;

			for (let j = 1; j <= endIndex; j++) {
				const flag = "-" + arg[j];
				option = this.getOptionForFlag(flag);
				if (!option) continue;

				if (!options.hasIndex(option.name)) options[option.name] = [];
				options[option.name]!.push("");
				found = true;
			}

			if (found) args.remove(i);
		}

		return options;
	}

	getUsage(): string {
		let output = this.fullName;
		if (this.options.length) output += " [OPTIONS]";

		for (const arg of this.arguments) {
			let text = arg.name.upper();
			if (!arg.required) {
				text = `[${text}]`;
			}
			else {
				text = `(${text})`;
			}

			if (arg.rest) {
				text += "...";
			}

			output += " " + text;
		}

		return output;
	}

	showHelp(process: Process) {
		process.write(1, this.description + "\n");

		process.write(1, "Usage:");
		process.write(1, "  " + this.getUsage());

		if (this.examples.length) {
			process.write(1, "\nExample:");
			const padded: string[] = [];
			for (const example of this.examples) {
				padded.push("  " + example);
			}

			process.write(1, padded.join(char(10)));
		}

		if (this.subcommands.length) {
			process.write(1, "\nSubcommands:");
			const subOut: string[] = [];
			for (const subcommand of this.subcommands) {
				subOut.push(`§§${subcommand.name} ${subcommand.description.replace(" ", "§")}`);
			}

			process.write(1, formatColumns(subOut.join("\n")).replace("§", " "));
		}

		if (this.options.length) {
			process.write(1, "\nOptions:");
			const optionsOut: string[] = [];
			for (const option of this.options) {
				optionsOut.push(`§§${option.flags.join(",§")} ${option.description.replace(" ", "§")}`);
			}

			process.write(1, formatColumns(optionsOut.join("\n").replace("§", " ")));
		}

		if (this.arguments.length) {
			process.write(1, "\nArguments:");
			const argsOut: string[] = [];
			for (const arg of this.arguments) {
				argsOut.push(`§§${arg.name.upper()} ${arg.description.replace(" ", "§")}`);
			}

			process.write(1, formatColumns(argsOut.join("\ŋ").replace("§", " ")));
		}
	}

	private getOptionForFlag(flag: string): Required<CommandOption> | null {
		if (flag.indexOf("=") != null) {
			flag = flag.split("=")[0]!;
		}

		for (const option of this.options) {
			if (option.flags.indexOf(flag) === null) continue;

			let overrideArgs = false;
			let type: CommandOption["type"] = "boolean";

			if (option.overrideArgs) overrideArgs = option.overrideArgs;
			if (option.type) type = option.type;

			return {
				name: option.name,
				flags: option.flags,
				description: option.description,
				overrideArgs,
				type,
			};
		}

		return null;
	}

	private fill(data: CommandData): CommandData {
		if (!data.options) data.options = [];
		if (!data.arguments) data.arguments = [];
		if (!data.subcommands) data.subcommands = [];

		for (const subcommandData of data.subcommands) {
			const full = this.fillSubCommandData(subcommandData, data);
			const subcommand = new Command(full);
			subcommand.fullName = `${this.fullName} ${subcommand.name}`;
			this.subcommands.push(subcommand);
		}

		return data;
	}

	private fillSubCommandData(subData: SubcommandData, data: CommandData): CommandData {
		const out = Object.assign(subData, { 
			category: data.category 
		});
		return out;
	}
}