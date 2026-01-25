import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

const command = new Command({
	name: "eval",
	description: "Evaluates GreyScript code. Reads from stdin too",
	category: "Data Operations",
	examples: [
		"eval print(2+2)",
		`eval "print('hello world')"`
	],
	arguments: [
		{
			name: "code",
			description: "The GreyScript code to evaluate. Each arg is one line",
			required: false,
			rest: true,
		}
	],
	options: [
		{
			name: "reverse",
			flags: ["-r", "--reverse"],
			description: "Put lines from stdin after the command arguments"
		}
	],
	requirements: {
		hasShell: true,
	}
});

command.run = function (args, options, process) {
	const session = FluxCore.currSession();

	const randomName = md5(Math.random() + currentDate());
	const randomSrc = randomName + ".src";
	const randomFullPath = `${session.workingDir}/${randomSrc}`;

	let userLines: string[] = [];
	if ("reverse" in options)
		userLines = args.concat(process.read(0));
	else
		userLines = process.read(0).concat(args);

	if (!userLines.length) {
		process.write(2, "No code given to run");
		return EXIT_CODES.MISUSE;
	}

	const touchResult = session.computer.touch(session.workingDir, randomSrc);
	if (isType(touchResult, "string")) {
		process.write(2, `Failed to create source file: ${touchResult}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const baseCode = [
		`@print = function(value, replace_text)`,
		`	if replace_text then get_custom_object["${randomName}"].output = []`,
		`	get_custom_object["${randomName}"].output.push(value)`,
		`end function`,
	].join(char(10));

	const sourceLines: string[] = [
		baseCode,
		...userLines,
		`get_custom_object["${randomName}"].crashed = false`
	];

	const sourceFile = session.computer.file(randomFullPath)!;
	const sourceContent = sourceLines.join(char(10));

	const setResult = sourceFile.setContent(sourceContent);
	if (isType(setResult, "string")) {
		process.write(2, `Failed to set source file content: ${setResult}`);
		sourceFile.delete();
		return EXIT_CODES.GENERAL_ERROR;
	}

	const buildResult = session.shell!.build(sourceFile.path(), session.workingDir, false);
	if (buildResult) {
		process.write(2, `Failed to build source file: ${buildResult}`);
		sourceFile.delete();
		return EXIT_CODES.GENERAL_ERROR;
	}

	sourceFile.delete();

	getCustomObject()[randomName] = {};
	getCustomObject()[randomName].output = [];
	getCustomObject()[randomName].crashed = true;

	const binaryPath = session.workingDir + "/" + randomName;
	const launchResult = session.shell!.launch(binaryPath);
	session.computer.file(binaryPath)!.delete();

	if (!getCustomObject()[randomName] || getCustomObject()[randomName].crashed) {
		const lineDiff = baseCode.split(char(10)).length;
		const exampleErrorLine = sourceContent.split(char(10)).length - 1;
		const message = [
			"It seems your code crashed.",
			`The real error happened ${lineDiff} lines before the reported one`,
			`Example: [${binaryPath} line ${exampleErrorLine}] would mean that the error was on line ${exampleErrorLine - lineDiff} of your inputs`
		].join(char(10));

		process.write(2, message);
	}

	let output: string[] = [];
	const scriptOutput = getCustomObject()[randomName]["output"];
	if (scriptOutput) {
		output = scriptOutput;
	}

	Object.remove(getCustomObject(), randomName);

	if (launchResult === false) {
		process.write(2, `Failed to launch bin file because shell.launch has a 2 second cooldown`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, output);
	return EXIT_CODES.SUCCESS;
};