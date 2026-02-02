import { Libex } from "../../utils/libex";
import { basename } from "../../utils/libokka";
import { FluxCore } from "../core/FluxCore";
import type { Session } from "../core/Session";
import { Command } from "../shell/Command";
import { EXIT_CODES } from "../shell/FluxShell";

interface Ext {
	setVisited(publicIp: string, localIp: string): void;
	hasVisited(publicIp: string, localIp: string): boolean;
	getBounces(router: GreyHack.Router): string[];
	exploit(lib: GreyHack.MetaLib, router: GreyHack.Router): void;
	exploitLocal(): void;
	exploitRemote(target: string): void;
	getNextTarget(shell: GreyHack.Shell): string | null;
	getNextSessions(): Session[];
	crawl(depth: number): void;
}

const command = new Command<Ext>({
	name: "crawl",
	description: "Crawls the given network",
	category: "Hacking",
	arguments: [
		{
			name: "ip",
			description: "The public or local IP of the target",
			required: true,
		}
	],
	requirements: {
		hasShell: true
	}
});

command.funcs.setVisited = function(publicIp, localIp) {
	FluxCore.raw.visitedDevices.push(publicIp + "-" + localIp);
}

command.funcs.hasVisited = function(publicIp, localIp) {
	return FluxCore.raw.visitedDevices.indexOf(publicIp + "-" + localIp) !== null;
}

command.funcs.getBounces = function(router) {
	const available: string[] = [];

	for (const ip of router.devicesLanIp()) {
		if (ip === router.localIp) continue;
		if (this.hasVisited(router.publicIp, router.localIp)) continue;

		available.push(ip);
	}

	return available;
}

command.funcs.exploit = function(lib, router) {
	Libex.exploitLib(router.publicIp, lib);

	const bounces = this.getBounces(router);
	for (const bounceIp of bounces) {
		Libex.exploitLib(router.publicIp, lib, bounceIp);
	}
}

command.funcs.exploitLocal = function() {
	const computer = FluxCore.currSession().computer;
	if (!FluxCore.raw.crawlingLocally && computer.publicIp === FluxCore.raw.crawlPublicIp) return;

	const session = FluxCore.getBestSession(computer.publicIp, computer.localIp)!;
	if (!session.metax || !session.shell) return;

	const libFolder = computer.file("/lib");
	if (!libFolder || !libFolder.isFolder()) return;

	let router = getRouter(computer.localIp);
	if (router) {
		const netSession = session.metax.netUse(router.localIp, 0);
		if (netSession) this.exploit(netSession.dumpLib(), router);
	}
	else {
		router = getRouter(computer.networkGateway());
	}

	if (!router) return;

	for (const file of libFolder.getFiles()!) {
		const metaLib = session.metax.load(file.path());
		if (!metaLib) continue;

		this.exploit(metaLib, router);
	}
}

command.funcs.exploitRemote = function(target) {
	const session = FluxCore.currSession();
	if (!session.computer.isNetworkActive() || !session.shell || !session.metax) return;

	let router = getRouter(target);

	let ports: GreyHack.Port[] | string | null = [];
	if (router) {
		ports = router.usedPorts();

		const netSession = session.metax.netUse(target, 0);
		if (netSession) this.exploit(netSession.dumpLib(), router);
	}
	else {
		router = getRouter()!;
		ports = router.devicePorts(target);
	}

	if (!isType(ports, "list")) {
		console.log(`<color=red><b>${ports}`);
		console.log(`<color=red><b>${session.publicIp} ${session.localIp} ${target}`);
		return;
	}

	for (const port of ports) {
		if (port.isClosed()) continue;

		const netSession = session.metax.netUse(target, port.portNumber);
		if (!netSession) continue;

		this.exploit(netSession.dumpLib(), router);
	}
}

command.funcs.getNextTarget = function(shell) {
	const gateway = getRouter(shell.hostComputer.networkGateway());
	if (!gateway) return null;

	for (const ip of gateway.devicesLanIp()) {
		if (this.hasVisited(gateway.publicIp, ip)) continue;
		if (FluxCore.getSession(gateway.publicIp, ip)) continue;
		return ip;
	}

	return null;
}

command.funcs.getNextSessions = function() {
	const sessions: Session[] = [];
	for (const session of FluxCore.getSessions()) {
		if (session.publicIp !== FluxCore.raw.crawlPublicIp) continue;
		if (!session.shell) continue;
		if (this.hasVisited(session.computer.publicIp, session.computer.localIp)) continue;

		sessions.push(session);
	}

	return sessions;
}

command.funcs.crawl = function(depth) {
	if (depth > 6) exit("Going too deep!");

	console.log("<color=#FFD82A>Current depth: " + depth);
	const session = FluxCore.currSession();
	if (!session.shell) {
		console.log(`<color=red>Current session doesn't have shell`);
		return;
	}

	if (depth > 0 || FluxCore.raw.crawlingLocally) {
		this.exploitLocal();
		this.setVisited(session.publicIp, session.localIp);

		let router = getRouter(session.computer.networkGateway());
		if (!router) router = getRouter()!;

		for (const ip of router.devicesLanIp()) {
			if (this.hasVisited(router.publicIp, ip)) continue;
			if (FluxCore.getSession(router.publicIp, ip)) continue;

			this.exploitRemote(ip);
		}
	}

	// Clear logs
	if (depth === 1 && !FluxCore.raw.crawlingLocally) {
		const result = Libex.corruptLog(session.shell);
		if (isType(result, "string"))
			console.log(`<color=red>Failed to corrupt log: ${result}`);
		else
			console.log(`<color=green>Log corrupted for: ${session.localIp}`);
	}

	const nextSessions = this.getNextSessions();
	for (const nextSession of nextSessions) {
		if (!nextSession.shell) continue;
		if (!FluxCore.scpFlux(nextSession.shell, "/home/guest")) continue;

		const path = "/home/guest/" + basename(programPath());
		const launchParams = "crawl " + str(depth + 1);

		FluxCore.raw.sessionPath.push(nextSession);
		const launchRes = nextSession.shell.launch(path, launchParams);
		FluxCore.raw.sessionPath.pop();

		if (isType(launchRes, "string"))
			console.log(launchRes.color("red"));

		const file = nextSession.computer.file(path);
		if (file) file.delete();
	}
}

command.run = function (args, _options, process) {
	if (FluxCore.raw.crawlPublicIp) {
		if (!args.length) exit("<color=red>Not enough params when crawling");
		
		const depth = args[0].toInt();
		if (!isType(depth, "number")) exit(`<color=red>Given depth for crawling was not numeric for some reason (${depth})`);

		this.funcs.crawl(depth);
		return EXIT_CODES.SUCCESS;
	}

	const target = args[0];
	const router = getRouter(target);
	const session = FluxCore.currSession();

	if (!router) {
		process.write(2, "Couldn't find a router with IP: " + target);
		return EXIT_CODES.GENERAL_ERROR;
	}

	FluxCore.raw.visitedDevices = [];
	FluxCore.raw.crawlingLocally = false;
	FluxCore.raw.crawlPublicIp = router.publicIp;

	if (router.publicIp === session.publicIp) {
		FluxCore.raw.crawlingLocally = true;
		this.funcs.setVisited(session.publicIp, session.localIp);
	}

	this.funcs.exploitRemote(target);
	this.funcs.crawl(0);
	FluxCore.raw.crawlPublicIp = "";

	process.write(1, `Visited ${FluxCore.raw.visitedDevices.length} devices`);
	process.write(1, FluxCore.raw.visitedDevices.join(", "));

	return EXIT_CODES.SUCCESS;
};