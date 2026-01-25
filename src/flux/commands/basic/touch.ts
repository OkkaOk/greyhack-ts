import { basename } from "../../../utils/libokka";
import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "touch",
	description: "Creates a new text file",
	category: "System Management",
	arguments: [
		{
			name: "file",
			description: "The name of the file",
			required: true
		}
	]
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	const filePath = session.resolvePath(args[0]);
	const result = session.computer.touch(parentPath(filePath), basename(filePath));

	if (isType(result, "string")) {
		process.write(2, result);
		return EXIT_CODES.GENERAL_ERROR;
	}
	
	return EXIT_CODES.SUCCESS;
};