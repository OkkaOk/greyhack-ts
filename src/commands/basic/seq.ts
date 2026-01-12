import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";
import { JSON } from "../../utils/JSON";

const command = new Command({
	name: "seq",
	description: "Create a range of numbers",
	category: "Data Operations",
	arguments: [
		{
			name: "first",
			description: "The first number in the sequence",
			required: true,
		},
		{
			name: "last",
			description: "The last number in the sequence",
			required: false,
		},
		{
			name: "increment",
			description: "The increment between numbers. Defaults to 1",
			required: false,
		},
	],
	options: [
		{
			name: "separator",
			flags: ["-s", "--separator"],
			description: `Separate the numbers with custom string instead of newline (\\${char(8288)}n)`,
			type: "string"
		},
	]
});

command.run = function (args, options, process) {
	let first = 1;
	let last = 0;
	let increment = 1;
	if (args.length === 1) {
		last = JSON.parse(args[0]!);
	}
	else {
		first = JSON.parse(args[0]!);
		last = JSON.parse(args[1]!);
	}

	if (args.length >= 3)
		increment = JSON.parse(args[2]!);

	function fractionDigits(num: number) {
		const numStr = str(num);
		const dotIndex = numStr.indexOf(".");
		if (dotIndex === null) return 0;
		return slice(numStr, dotIndex + 1).length;
	}

	const digits = Math.max(fractionDigits(first), fractionDigits(last), fractionDigits(increment));

	if (!isType(first, "number") || !isType(last, "number") || !isType(increment, "number")) {
		process.write(2, "Given arguments are invalid");
		return EXIT_CODES.MISUSE;
	}

	if (increment === 0 || (last < first && increment > 0) || (last > first && increment < 0)) {
		process.write(2, "The last number is impossible to reach with given values");
		return 2;
	}

	const output: string[] = [];
	let current = first;
	while (true) {
		output.push(current.toFixed(digits));
		current += increment;
		if (increment > 0 && current > last) break;
		if (increment < 0 && current < last) break;
	}

	if ("separator" in options) {
		const separator = options["separator"][0] as string;
		process.write(1, output.join(separator));
		return EXIT_CODES.SUCCESS;
	}

	process.write(1, output);
	return EXIT_CODES.SUCCESS;
};