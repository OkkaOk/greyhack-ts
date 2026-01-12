import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";
import { formatColumnsf } from "../../utils/libokka";

const command = new Command({
	name: "ps",
	description: "Shows active processes",
	category: "System Management",
});

command.run = function (_args, _options, process) {
	const session = FluxCore.currSession();
	const procs = session.computer.showProcs().split("\\n");
	process.write(1, formatColumnsf(procs, "left", false, {}, 3));
	
	return EXIT_CODES.SUCCESS;
};