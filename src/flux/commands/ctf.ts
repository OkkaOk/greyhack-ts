import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

const command = new Command({
	name: "ctf",
	description: "Manage ctf events",
	category: "Other",
	subcommands: [
		{
			name: "join",
			description: "Joins a CTF event",
			arguments: [
				{
					name: "user",
					description: "Your username",
					required: true,
				},
				{
					name: "password",
					description: "Your password",
					required: true,
				},
				{
					name: "name",
					description: "The name of the event",
					required: true,
				}
			]
		},
		{
			name: "submit",
			description: "Checks if you are successful",
		}
	]
});

// Join
command.subcommands[0].run = function (args, _options, process) {
	const ctfEvent = getCtf(args[0], args[1], args[2]);
	if (isType(ctfEvent, "string")) {
		process.write(2, `Failed to get ctf event: ${ctfEvent}`);
		return EXIT_CODES.GENERAL_ERROR;
	}

	FluxCore.raw.currentCtf = ctfEvent;
	return EXIT_CODES.SUCCESS;
};

// Submit
command.subcommands[1].run = function (_args, _options, process) {
	if (!FluxCore.raw.currentCtf) {
		process.write(2, "You are currently not in a ctf event");
		return EXIT_CODES.MISUSE;
	}

	if (FluxCore.raw.currentCtf.playerSuccess()) {
		process.write(1, "<color=green>Success!");
	}
	else {
		process.write(1, "You have not completed the ctf event yet");
	}

	return EXIT_CODES.SUCCESS;
};