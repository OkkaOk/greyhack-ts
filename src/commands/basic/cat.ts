import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "cat",
	description: "Shows the contents of a file",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "file",
			description: "The path(s) of the file(s). Can be relati",
			required: true,
			rest: true
		}
	],
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	
	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;
	if (!args.length) {
		process.write(1, process.read(0));
		return exitCode;
	}

	for (const filePath of args) {
		if (filePath === "-") {
			process.write(1, process.read(0))
			continue;
		}

		const absPath = session.resolvePath(filePath);
		const fd = process.open(absPath, "r");
		if (!fd) {
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		process.write(1, process.read(fd));
		process.close(fd);
	}

	return exitCode;
};