import { FluxCore } from "../../core/FluxCore";
import { Command, type ExitCodeType } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "kill",
	description: "Kills active processes",
	category: "System Management",
	examples: ["kill 7970 7960", "ps | grep FileExplorer | cols 1 | kill"],
	acceptsStdin: true,
	arguments: [
		{
			name: "pid",
			description: "The PID(s) of the process(es) to kill",
			required: true,
			rest: true,
		}
	],
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();
	const procs = slice(session.computer.showProcs().split("\\n"), 1);
	const processes: Record<string, string> = {};
	for (const item of procs) {
		const parts = item.split(" ");
		const pid = parts[1]!;
		const name = parts[4]!;
		processes[pid] = name;
	}

	const pidsToKill = args.concat(process.read(0));

	if (!pidsToKill.length) {
		process.write(2, "No PIDs to kill provided");
		return EXIT_CODES.MISUSE;
	}

	let exitCode: ExitCodeType = EXIT_CODES.SUCCESS;

	for (const pid of pidsToKill) {
		if (!processes[pid]) {
			process.write(2, `Process with PID ${pid} doesn't exist.`);
			continue;
		}

		const closeResult = session.computer.closeProgram(pid.toInt() as number);
		if (isType(closeResult, "string")) {
			process.write(2, `Failed to kill process: ${closeResult}`);
			exitCode = EXIT_CODES.GENERAL_ERROR;
			continue;
		}

		process.write(1, `Process ${processes[pid]} (${pid}) killed`);
	}

	return exitCode;
};