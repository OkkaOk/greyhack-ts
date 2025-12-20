import { FluxShell } from "../shell/FluxShell";
import type { FluxCoreGCO, FluxShellGCO, GCOType } from "../types/core";
import { GreyDB } from "./GreyDB";
import { Session } from "./Session";

export class FluxCore {
	static raw: FluxCoreGCO & FluxShellGCO;

	static initialize() {
		globals.wasInitialized = getCustomObject<GCOType>().hasIndex("fluxCore");
		if (!globals.wasInitialized) {
			this.checkCredentials();
			if (!params.length) this.printArt();
		}

		FluxShell.initialize();
		const gcof = this.initializeGCO();

		this.raw = gcof;
	}

	static initializeGCO(): typeof this.raw {
		const gco = getCustomObject<GCOType>();
		if (gco.hasIndex("fluxCore")) {
			return Object.assign(gco.fluxCore, gco.fluxShell);
		}

		gco.fluxCore = {} as any;
		const gcof = gco.fluxCore;
		const gcosh = FluxShell.initializeGCO();
		gcosh.core = this;

		gcof.database = new GreyDB();
		if (params.length) gcof.database.logLevel = 1;
		gcof.database.login("okka", "kukka");

		gcof.database.addTable("hashes", ["hash", "plain"], false, "hash");

		const session = new Session(getShell(), true, false, false);
		session.workingDir = currentPath();

		gcof.currentCtf = null;
		gcof.nonFluxWarned = false;
		gcof.crawlPublicIp = "";
		gcof.data = {};
		gcof.sessions = { [session.id]: session };
		gcof.sessionPath = [session];
		gcof.visitedDevices = [];

		// Load aliases
		for (const obj of gcof.database.fetch("aliases", {})) {
			gcosh.aliases[obj.alias] = obj.ref;
		}

		// Load env variables
		for (const obj of gcof.database.fetch("env", {})) {
			gcosh.aliases[obj.varName] = obj.value;
		}

		gcosh.env["PWD"] = session.workingDir;
		gcosh.env["?"] = 0;

		if (!globals.hasIndex("IS_GREYBEL")) {
			if (!gcosh.env.hasIndex("HACKSHOP_IP") && session.computer.isNetworkActive()) {
				print("Fetching hackshop ip...");
				// TODO: finish
			}
		}
		else {
			gcosh.aliases["q"] = "quit";
		}

		// Load settings
		const defaultSettings = this.getDefaultSettings();
		let settings = gcof.database.fetchOne("settings");

		if (!settings) {
			settings = defaultSettings;
			gcof.database.insert("settings", settings);
		}

		for (const settingKey of defaultSettings.indexes() as (keyof typeof defaultSettings)[]) {
			if (!settings.hasIndex(settingKey)) {
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

	static currSession(): Session {
		return this.raw.sessionPath[-1];
	}

	static getSessions(): Session[] {
		return this.raw.sessions.values();
	}

	static getSession(publicIp?: string, localIp?: string, user?: string, type?: string, id?: string): Session | null {
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

		if (FluxShell.raw.settings["killWorseSessions"]) {
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
			targetShell.hostComputer.createFolder(parentPath(folder), folder.split("/")[-1]);
		}

		const scpResult = this.currSession().shell?.scp(programPath(), folder, targetShell);
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

	static decipher(hash: string) {

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