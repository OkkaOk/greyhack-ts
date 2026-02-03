import { Libex } from "../../utils/libex";
import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

interface Ext {
	getLanTarget: (router: GreyHack.Router) => string;
}

const command = new Command<Ext>({
	name: "hashcrawl",
	description: "Exploits random routers for the purpose of filling the database with hashes",
	category: "Hacking",
	options: [
		{
			name: "verbose",
			flags: ["-v", "--verbose"],
			description: "Show extra details",
		},
		{
			name: "limit",
			flags: ["--limit"],
			description: "How many routers to check before stopping",
			type: "number",
		},
		{
			name: "time_limit",
			flags: ["--time-limit"],
			description: "How many seconds is the script allowed to run for",
			type: "number",
		}
	],
	requirements: {
		hasShell: true
	}
});

command.run = function (_args, options, process) {
	const session = FluxCore.currSession();
	if (!session.metax) session.loadLibs();
	if (!session.metax) {
		process.write(2, "Current session doesn't have metax loaded");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const startTime = time();
	const startHashCount = FluxCore.raw.database.fetch("hashes").length;

	const verbose = Object.hasOwn(options, "verbose");
	const limit = options["limit"]?.[0] as number ?? -1;
	let timeLimit = options["time_limit"]?.[0] as number ?? -1;
	let count = 0;

	if (timeLimit === -1 && limit === -1) {
		process.write(1, "No limit was set. Setting a time limit of 60 seconds");
		timeLimit = 60;
	}

	const stopTime = startTime + timeLimit;

	const octets = [
		1 + Math.floor(Math.random() * 200),
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
		Math.floor(Math.random() * 255),
	];

	outer: while (true) {
		console.clear();

		if (timeLimit !== -1 && time() > stopTime)
			break;

		const routerIp = `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}`;
		const router = getRouter(routerIp);

		octets[0] += 1;
		if (octets[0] > 255) {
			octets[1] += 1;
			octets[0] = 0;
		}
		if (octets[1] > 255) {
			octets[2] += 1;
			octets[1] = 0;
		}
		if (octets[2] > 255) {
			octets[3] += 1;
			octets[2] = 0;
		}
		if (octets[3] > 255)
			break;

		if (!router) continue;

		const netSessionKernel = session.metax.netUse(routerIp, 0);
		if (netSessionKernel) Libex.exploitLib(routerIp, netSessionKernel.dumpLib(), "", verbose);

		const ports = router.usedPorts();
		for (const port of ports) {
			if (port.isClosed()) continue;

			const netSession = session.metax.netUse(routerIp, port.portNumber);
			if (netSession) Libex.exploitLib(router.publicIp, netSession.dumpLib(), "", verbose);

			if (timeLimit !== -1 && time() > stopTime) {
				break outer;
			}
		}

		count++;
		if (limit !== -1 && count >= limit)
			break;
	}

	const obtainedHashCount = FluxCore.raw.database.fetch("hashes").length - startHashCount;
	process.write(1, `<color=#CC00FF>Collecting complete! Went through ${count} routers. Obtained ${obtainedHashCount} hashes.</color>`);
	return EXIT_CODES.SUCCESS;
};