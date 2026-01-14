import { FluxCore } from "../../core/FluxCore";
import { Command } from "../../shell/Command";
import { EXIT_CODES } from "../../shell/FluxShell";

const command = new Command({
	name: "su",
	description: "Switches user",
	category: "System Management",
	arguments: [
		{
			name: "user",
			description: "Which user to login to",
			required: true,
		},
		{
			name: "password",
			description: "The password of the user. Tries to brute force it if not given.",
			required: false,
		}
	],
	requirements: {
		hasShell: true,
	}
});

command.run = function (args, _options, process) {
	const session = FluxCore.currSession();

	if (args[0] === session.user) {
		process.write(1, "You are already on that user.");
		return EXIT_CODES.SUCCESS;
	}

	// Check if we already have a session for this user
	const existing = FluxCore.getSession(session.publicIp, session.localIp, args[0], "shell");
	if (existing)
		return existing.connect() ? EXIT_CODES.SUCCESS : EXIT_CODES.GENERAL_ERROR;

	if (args.length >= 2) {
		const success = session.switchUser(args[0], args[1]);
		if (success) return EXIT_CODES.SUCCESS;

		process.write(2, "Invalid username or password");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const hashes = FluxCore.raw.database.fetch("hashes");
	for (const pair of hashes) {
		const success = session.switchUser(args[0], pair.plain);
		if (!success) continue;

		process.write(1, `Brute force successful! Password was ${pair.plain}`);
		return EXIT_CODES.SUCCESS;
	}

	process.write(1, "Failed to brute force the password");
	return EXIT_CODES.GENERAL_ERROR;
};