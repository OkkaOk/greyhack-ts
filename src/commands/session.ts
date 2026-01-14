import { FluxCore } from "../core/FluxCore";
import type { Session } from "../core/Session";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";
import type { Process } from "../shell/Process";
import { formatColumnsf } from "../utils/libokka";

const command = new Command({
	name: "session",
	description: "Manage sessions",
	category: "Networking",
	subcommands: [
		{
			name: "use",
			description: "Connect to a session",
			arguments: [
				{
					name: "session_index",
					description: "The index of the session found in list",
					required: false,
				}
			]
		},
		{
			name: "kill",
			description: "Kills a session",
			arguments: [
				{
					name: "session_index",
					description: "The index of the session found in list",
					required: false,
				}
			],
			options: [
				{
					name: "all",
					flags: ["-a", "--all"],
					description: "Kills all sessions",
				}
			]
		},
		{
			name: "list",
			description: "Lists available sessions",
		},
		{
			name: "terminal",
			description: "Quits the script to start the terminal here",
			requirements: { hasShell: true },
		},
	]
});

function refreshSessions() {
	for (const session of FluxCore.getSessions()) {
		if (!session.metax) continue;

		const rshells = session.metax.rshellServer();
		if (isType(rshells, "string")) continue;

		for (const rshell of rshells) {
			FluxCore.createSession(rshell, false, true);
		}
	}
}

function listSessions(process: Process): boolean {
	refreshSessions();

	if (!FluxCore.raw.sessions.size) {
		process.write(1, "No sessions found!");
		return false;
	}

	const out = ["<u># Public Local User Type Status Metax Crypto Apt</u>"];

	function libLoaded(session: Session, libKey: "metax" | "apt" | "crypto") {
		let text = "<color=#FF6600>null";
		if (session[libKey]) text = "<color=green>Loaded";
		return text;
	}

	let index = 1;
	for (const session of FluxCore.getSessions()) {
		let connected = "<color=#FFBF34>Inactive";
		if (FluxCore.pathContainsSession(session)) connected = "<color=green>Active";

		const metax = libLoaded(session, "metax");
		const crypto = libLoaded(session, "crypto");
		const apt = libLoaded(session, "apt");

		out.push(`${index} ${session.publicIp} ${session.localIp} ${session.user} ${session.type} ${connected} ${metax} ${crypto} ${apt}`);
		index += 1;
	}

	process.write(1, formatColumnsf(out, "left", false, { "§": " " }));
	return true;
}

// Use
command.subcommands[0].run = function (args, _options, process) {
	refreshSessions();

	let index: string | number = 0;
	if (!args.length) {
		const res = listSessions(process);
		if (!res) return EXIT_CODES.GENERAL_ERROR;

		index = userInput("Which session to use > ").toInt();
	}
	else {
		index = args[0].toInt();
	}

	if (!isType(index, "number")) {
		process.write(2, "Index was not a number");
		return EXIT_CODES.MISUSE;
	}

	if (index < 1 || index > FluxCore.raw.sessions.size) {
		process.write(2, `Invalid index (${index})`);
		return EXIT_CODES.MISUSE;
	}

	process.write(1, process.read(0));
	const session = FluxCore.getSessions()[index - 1];
	session.connect();

	return EXIT_CODES.SUCCESS;
};

// Kill
command.subcommands[1].run = function (args, options, process) {
	refreshSessions();

	if (options["all"]) {
		for (const session of FluxCore.getSessions()) {
			if (session.isHome) continue;

			session.kill();
		}
		return EXIT_CODES.SUCCESS;
	}

	let index: string | number = 0;
	if (!args.length) {
		const res = listSessions(process);
		if (!res) return EXIT_CODES.GENERAL_ERROR;

		index = userInput("Which session to kill > ").toInt();
	}
	else {
		index = args[0].toInt();
	}

	if (!isType(index, "number")) {
		process.write(2, "Index was not a number");
		return EXIT_CODES.MISUSE;
	}

	if (index < 1 || index > FluxCore.raw.sessions.size) {
		process.write(2, `Invalid index (${index})`);
		return EXIT_CODES.MISUSE;
	}

	const session = FluxCore.getSessions()[index - 1];
	const res = session.kill();
	if (res) {
		process.write(1, "Session killed");
		return EXIT_CODES.SUCCESS;
	}

	return EXIT_CODES.GENERAL_ERROR;
};

// List
command.subcommands[2].run = function (_args, _options, process) {
	listSessions(process);
	return EXIT_CODES.SUCCESS;
};

// Terminal
command.subcommands[3].run = function (_args, _options, _process) {
	FluxCore.raw.exiting = true;
	FluxCore.raw.env["?"] = EXIT_CODES.SUCCESS;
	return FluxCore.currSession().shell!.startTerminal();
};