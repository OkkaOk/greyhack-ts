import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import { Libex } from "../utils/libex";
import { ynPrompt } from "../utils/libokka";

const command = new Command({
	name: "corrupt",
	description: "Corrupts the log",
	category: "Hacking",
});

command.run = function (_args, _options, process) {
	const session = FluxCore.currSession();

	const yn = ynPrompt("Also delete flux binary from guest folder", "n");
	if (yn === "y") {
		const binaryFile = session.computer.file(programPath());
		if (!binaryFile) {
			process.write(2, "Failed to delete the binary as it doesn't exist anymore");
			return EXIT_CODES.GENERAL_ERROR;
		}

		const result = binaryFile.delete();
		if (result) {
			process.write(2, result);
			return EXIT_CODES.GENERAL_ERROR;
		}
	}

	const result = Libex.corruptLog(session.computer);
	if (isType(result, "string")) {
		process.write(2, result);
		return EXIT_CODES.GENERAL_ERROR;
	}

	process.write(1, "<color=green>Log corrupted!");
	return EXIT_CODES.SUCCESS;

};