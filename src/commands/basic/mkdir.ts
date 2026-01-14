import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";
import { basename } from "../../utils/libokka";

const command = new Command({
	name: "mkdir",
	description: "Creates a new folder",
	category: "System Management",
	arguments: [
		{
			name: "folder",
			description: "The name of the folder",
			required: true
		}
	]
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	const folderPath = session.resolvePath(args[0]);
	const result = session.computer.createFolder(parentPath(folderPath), basename(folderPath));

	if (isType(result, "string")) {
		process.write(2, result);
		return EXIT_CODES.GENERAL_ERROR;
	}
	
	return EXIT_CODES.SUCCESS;
};