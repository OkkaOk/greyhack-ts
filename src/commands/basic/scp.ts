import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "scp",
	description: "Copies files to different sessions",
	category: "Networking",
	arguments: [
		{
			name: "from",
			description: "The file path of the file to send",
			required: true,
		},
		{
			name: "to",
			description: "The target path to send the file to. Must be absolute",
			required: true,
		},
	],
	options: [
		{
			name: "to_session",
			flags: ["-t", "--to-session"],
			description: "Which session is the file going to. Defaults to session 1",
			type: "number"
		},
		{
			name: "from_session",
			flags: ["-f", "--from-session"],
			description: "Which session is the file from. Defaults to current session",
			type: "number",
		},
	]
});

command.run = function (args, options, process) {
	let sessionFrom = FluxCore.currSession();
	let sessionTo = FluxCore.raw.sessionPath[0]!;

	if ("to_session" in options) {
		const index = (options["to_session"][0] as string).toInt();
		if (isType(index, "string") || index < 0 || index >= FluxCore.raw.sessions.size) {
			process.write(2, "Invalid 'to_session' index!");
			return EXIT_CODES.MISUSE;
		}

		const session = FluxCore.getSessions()[index]!;
		if (!session.shell) {
			process.write(2, "The session you're uploading the file to isn't a shell session!");
			return EXIT_CODES.GENERAL_ERROR;
		}

		sessionTo = session;
	}

	if ("from_session" in options) {
		const index = (options["from_session"][0] as string).toInt();
		if (isType(index, "string") || index < 0 || index >= FluxCore.raw.sessions.size) {
			process.write(2, "Invalid 'from_session' index!");
			return EXIT_CODES.MISUSE;
		}

		const session = FluxCore.getSessions()[index]!;
		if (!session.shell) {
			process.write(2, "The session you're uploading the file to isn't a shell session!");
			return EXIT_CODES.GENERAL_ERROR;
		}

		sessionFrom = session;
	}

	const filePath = sessionFrom.resolvePath(args[0]!);
	const scpResult = sessionFrom.shell!.scp(filePath, args[1]!, sessionTo.shell!);
	if (isType(scpResult, "string")) {
		process.write(1, `Failed to scp file: ${scpResult}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	const fileName = filePath.split("/")[-1];
	process.write(1, `${filePath.color("green")} copied to ${(args[1] + "/" + fileName).color("green")}`);

	return EXIT_CODES.SUCCESS;
};