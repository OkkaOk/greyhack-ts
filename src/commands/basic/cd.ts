import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "cd",
	description: "Changes directory",
	category: "System Management",
	arguments: [
		{
			name: "path",
			description: "The path of the folder",
			required: true,
		}
	]
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	const newPath = session.resolvePath(args[0]);

	const file = session.computer.file(newPath);
	if (!file) {
		process.write(2, "Invalid path");
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (!file.isFolder()) {
		process.write(2, `${file.path()} is not a folder.`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	cd(newPath);
	session.workingDir = newPath;

	return EXIT_CODES.SUCCESS;
};