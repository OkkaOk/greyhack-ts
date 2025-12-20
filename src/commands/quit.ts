import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES, FluxShell } from "../shell/FluxShell";

const command = new Command({
	name: "quit",
	description: "Quits the session",
	category: "System Management",
	options: [
		{
			name: "all",
			flags: ["-a", "--all"],
			description: "Quits from all sessions"
		}
	]
})

command.run = function(_args, options, _process) {
	if (!FluxCore.currSession().shell) {
		FluxCore.raw.sessionPath.pop();
		if (!options.hasIndex("all")) return EXIT_CODES.SUCCESS;
	}

	if (options.hasIndex("all")) FluxCore.raw.exiting = true;
	FluxShell.raw.env["?"] = EXIT_CODES.SUCCESS;
	exit("");
}