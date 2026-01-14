import { FluxShell } from "../shell/FluxShell";
import type { FluxCoreGCO, FluxShellGCO, GCOType } from "../types/core";
import { Libex } from "../utils/libex";
import { basename } from "../utils/libokka";
import { GreyDB } from "./GreyDB";
import { Session } from "./Session";

export class FluxCore {
	static raw: FluxCoreGCO & FluxShellGCO;

	static currSession(): Session {
		return this.raw.sessionPath[-1];
	}

	static initialize() {
		FluxShell.initialize();

		globals["wasInitialized"] = getCustomObject<GCOType>().hasIndex("fluxCore");
		if (!globals["wasInitialized"]) {
			this.checkCredentials();
			if (!params.length) this.printArt();
		}

		const gcof = this.initializeGCO();

		this.raw = gcof;

		if (!globals["wasInitialized"]) {
			// Load saved proxies
			const proxies = gcof.database.fetch("devices", { "isProxy": true });
			for (const proxy of proxies) {
				if (!proxy.publicIp) continue;
				if (!proxy.password) continue;

				const proxyShell = getShell().connectService(proxy.publicIp, 22, "root", proxy.password);
				if (!isType(proxyShell, "shell")) {
					print(`<color=red>Failed to connect to saved proxy ${proxy.publicIp}: ${proxyShell}`);
					continue;
				}

				const proxySession = new Session(proxyShell, false, false, true);
				gcof.sessions[proxySession.id] = proxySession;
				proxySession.connect("quit");

				Libex.corruptLog(proxyShell);

				if (!proxy.isRshellServer || !proxySession.metax) continue;

				const rshells = proxySession.metax.rshellServer();
				if (isType(rshells, "string")) continue;

				for (const rshell of rshells) {
					const rshellSession = new Session(rshell, false, true, false);
					gcof.sessions[rshellSession.id] = rshellSession;
				}
			}
		}

		const currSession = this.currSession();
		if (currSession.workingDir == "/") {
			currSession.workingDir = currentPath();
			FluxShell.raw.env["PWD"] = currSession.workingDir;
		}

		if (currSession.shell) {
			currSession.loadLibs();
		}

		if (currSession.apt && currSession.computer.isNetworkActive()) {
			if (!currSession.computer.file("/etc/apt/aptcache.bin") && "HACKSHOP_IP" in FluxShell.raw.env) {
				currSession.apt.addRepo(FluxShell.raw.env["HACKSHOP_IP"] as string);
				currSession.apt.update();
			}
		}
	}

	static initializeGCO(): typeof this.raw {
		const gco = getCustomObject<GCOType>();
		if (gco.fluxCore) {
			return Object.assign(gco.fluxCore, gco.fluxShell);
		}

		const session = new Session(getShell(), true, false, false);
		session.workingDir = currentPath();

		gco.fluxCore = {
			database: new GreyDB(),
			sessions: { [session.id]: session },
			sessionPath: [session],
			data: {},
			visitedDevices: [],
			crawlPublicIp: "",
			currentCtf: null,
			nonFluxWarned: false,
			exiting: false,
		};

		const gcof = gco.fluxCore;
		const gcosh = FluxShell.initializeGCO();
		gcosh.core = this;

		if (params.length) gcof.database.logLevel = 1;
		gcof.database.login("okka", "kukka");

		gcof.database.addTable("hashes", "hash");
		gcof.database.addTable("vulns");
		gcof.database.addTable("devices");
		gcof.database.addTable("settings");
		gcof.database.addTable("aliases", "key");
		gcof.database.addTable("env");
		gcof.database.addTable("secrets");

		// Load aliases
		for (const obj of gcof.database.fetch("aliases", {})) {
			gcosh.aliases[obj.key] = obj.value;
		}

		// Load env variables
		for (const obj of gcof.database.fetch("env", {})) {
			gcosh.env[obj.key] = obj.value;
		}

		gcosh.env["PWD"] = session.workingDir;
		gcosh.env["?"] = 0;

		if (!globals.hasIndex("IS_GREYBEL")) {
			if (!gcosh.env.hasIndex("HACKSHOP_IP") && session.computer.isNetworkActive()) {
				print("Fetching hackshop ip...");
				let ip = Libex.getIpWithPortOpen(1542);

				if (!isValidIp(ip)) {
					print("Failed to get it automatically in a timely manner");
					ip = userInput("Enter hackshop ip > ");
				}

				if (isValidIp(ip)) {
					gcosh.env["HACKSHOP_IP"] = ip;
					gcof.database.insert("env", { key: "HACKSHOP_IP", value: ip });
				}
			}
		}
		else {
			gcosh.aliases["q"] = "quit";
		}

		// Load settings
		const defaultSettings = this.getDefaultSettings();
		let settings = gcof.database.fetchOne("settings") as Record<string, any> | null;

		if (!settings) {
			settings = defaultSettings;
			gcof.database.insert("settings", defaultSettings);
		}

		for (const settingKey of defaultSettings.indexes() as (keyof typeof defaultSettings)[]) {
			if (!(settingKey in settings)) {
				settings[settingKey] = defaultSettings[settingKey];
				gcof.database.modified = true;
			}

			// @ts-ignore
			gcosh.settings[settingKey] = settings[settingKey];
		}

		gcof.database.save();

		return Object.assign(gcof, gcosh);
	}

	static getDefaultSettings() {
		return {
			"errorColor": "#FF0000",
			"killWorseSessions": true,
		};
	}

	static getSessions(): Session[] {
		return this.raw.sessions.values();
	}

	static getSession(publicIp?: string, localIp?: string, user?: string, type?: Session["type"], id?: string): Session | null {
		if (id && this.raw.sessions.hasIndex(id)) return this.raw.sessions[id];

		for (const session of this.getSessions()) {
			if (publicIp && publicIp != session.publicIp) continue;
			if (localIp && localIp != session.localIp) continue;
			if (user && user != session.user) continue;
			if (type && type != session.type) continue;

			return session;
		}

		return null;
	}

	static getBestSession(publicIp?: string, localIp?: string): Session | null {
		let best: Session | null = null;
		let bestLevel = -1;
		for (const session of this.getSessions()) {
			if (publicIp && publicIp != session.publicIp) continue;
			if (localIp && localIp != session.localIp) continue;
			if (session.userLevel <= bestLevel) continue;

			bestLevel = session.userLevel;
			best = session;

			if (bestLevel >= 2) break;
		}

		return best;
	}

	static createSession(device: GreyHack.Shell | GreyHack.Computer, isHome = false, isRshellClient = false, isProxy = false): Session | null {
		const newSession = new Session(device, isHome, isRshellClient, isProxy);

		if (this.raw.sessions.hasIndex(newSession.id)) return null;

		if (FluxShell.raw.settings["killWorseSessions"] && !isRshellClient && !isProxy) {
			for (const session of this.getSessions()) {
				if (newSession.publicIp != session.publicIp) continue;
				if (newSession.localIp != session.localIp) continue;

				// Not worth to add this session
				if (newSession.userLevel < session.userLevel) return null;
				if (!newSession.shell && session.shell) return null;

				// Prioritize shell sessions so kill a computer one if we got a shell session
				if (!session.shell && newSession.shell) {
					session.kill();
					continue;
				}

				// This new session has better user so kill the old one
				if (newSession.userLevel > session.userLevel) {
					session.kill();
					continue;
				}
			}
		}

		this.raw.sessions[newSession.id] = newSession;
		return newSession;
	}

	static scpFlux(targetShell: GreyHack.Shell, folder?: string): boolean {
		if (!folder) folder = "/home/guest";

		if (!targetShell.hostComputer.file(folder)) {
			targetShell.hostComputer.createFolder(parentPath(folder), basename(folder));
		}

		const scpResult = this.currSession().shell!.scp(programPath(), folder, targetShell);
		if (getType(scpResult) === "string") {
			print("<color=red>" + scpResult);
			return false;
		}

		return true;
	}

	static pathContainsSession(session: Session) {
		for (const other of this.raw.sessionPath) {
			if (session.id === other.id) return true;
		}

		return false;
	}

	static decipher(md5Hash: string): string | null {
		const row = this.raw.database.fetchOne("hashes", { hash: md5Hash });
		if (row) return row.plain;

		const cryptoSession = this.raw.sessionPath.find(s => s.crypto !== null);
		if (!cryptoSession) {
			print("<color=red>Failed to decipher password as I don't have the crypto library");
			return null;
		}

		const plain = cryptoSession.crypto!.decipher(md5Hash);
		if (!plain) return null;

		this.raw.database.insert("hashes", { hash: md5Hash, plain });
		return plain;
	}

	static checkCredentials() {
		if (globals.hasIndex("IS_GREYBEL")) {
			print("<color=green>Greybel detected. No need for credentials");
			return;
		}

		const comp = getShell().hostComputer;

		const spFile = comp.file("/home/guest/sp");
		if (spFile && md5(spFile.getContent()!) == "a4f1375d80e82d4cd8abf16cab156499") return;

		const password = userInput("Binary password: ", true);
		if (md5(password) != "a4f1375d80e82d4cd8abf16cab156499") {
			getCustomObject<GCOType>().remove("fluxCore");
			getCustomObject<GCOType>().remove("fluxShell");
			exit("<b><color=red>Invalid password</color></b>");
		}
	}

	static printArt() {

	}
}