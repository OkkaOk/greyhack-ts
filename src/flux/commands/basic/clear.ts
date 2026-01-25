import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "clear",
	description: "Clears the terminal",
	category: "Other",
});

command.run = function (_args, _options, _process) {
	clearScreen();
	return EXIT_CODES.SUCCESS;
};