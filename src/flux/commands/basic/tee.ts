import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "tee",
	description: "Copy stdin to files and also to stdout",
	category: "Data Operations",
	acceptsStdin: true,
	arguments: [
		{
			name: "file",
			description: "The output file(s)",
			required: true,
			rest: true,
		},
	],
	options: [
		{
			name: "append",
			flags: ["-a", "--append"],
			description: "Append to files instead of overwriting"
		},
	]
});

command.run = function (args, options, process) {
	const lines = process.read(0);

	const session = FluxCore.currSession();
	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const filePath of args) {
		const absPath = session.resolvePath(filePath);
		const fd = process.open(absPath, "w");
		if (!fd) {
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		if (!("append" in options))
			process.flush(fd);

		process.write(fd, lines);
		process.close(fd);
	}
	
	process.write(1, lines as string[]);
	return exitCode;
};