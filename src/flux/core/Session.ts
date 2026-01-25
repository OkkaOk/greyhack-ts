import { Libex } from "../../utils/libex";
import { basename, requireLib, resolvePath } from "../../utils/libokka";
import { FluxShell } from "../shell/FluxShell";
import { FluxCore } from "./FluxCore";

export class Session {
	classID = "session";
	shell: GreyHack.Shell | null = null;
	computer: GreyHack.Computer;
	type: "shell" | "computer";
	publicIp: string;
	localIp: string;
	user: string;
	workingDir: string;
	userLevel: 0 | 1 | 2;
	metax: GreyHack.Metaxploit | null = null;
	crypto: GreyHack.Crypto | null = null;
	apt: GreyHack.AptClient | null = null;
	isHome: boolean;
	isRshellClient: boolean;
	isProxy: boolean;
	id: string;

	constructor(device: GreyHack.Shell | GreyHack.Computer, isHome: boolean, isRshellClient: boolean, isProxy: boolean) {
		if (isType(device, "shell")) {
			this.shell = device;
			this.computer = device.hostComputer;
			this.type = "shell";
		}
		else {
			this.computer = device;
			this.type = "computer";
		}

		this.publicIp = this.computer.publicIp;
		this.localIp = this.computer.localIp;
		this.user = Libex.computerPrivileges(this.computer);
		this.isHome = isHome;
		this.isRshellClient = isRshellClient;
		this.isProxy = isProxy;
		this.id = md5(this.publicIp + this.localIp + this.user + this.isHome + this.isProxy + this.isRshellClient + this.type);

		this.workingDir = "/home/" + this.user;

		this.userLevel = 0;
		if (this.user == "root") {
			this.userLevel = 2;
			this.workingDir = "/root"
		}
		else if (this.user != "guest") {
			this.userLevel = 1;
		}

		this.metax = null;
		this.crypto = null;
		this.apt = null;
	}

	/** Switches the session's shell to the given user */
	switchUser(username: string, password: string): boolean {
		const curr = FluxCore.currSession();
		if (curr.publicIp === this.publicIp && curr.localIp === this.localIp) {
			const shell = getShell(username, password);
			if (!shell) return false;

			this.shell = shell;
			this.computer = shell.hostComputer;
			this.user = username;
			this.userLevel = 1;
			this.workingDir = "/home/" + username;
			if (this.user === "root") {
				this.userLevel = 2;
				this.workingDir = "/root";
			}
			return true;
		}

		// TODO: remote switch user
		return false;
	}

	connect(launchParams = ""): boolean {
		if (!FluxCore.currSession().shell) {
			FluxCore.raw.sessionPath.pop();
		}

		if (!this.shell) {
			FluxCore.raw.sessionPath.push(this);
			return true;
		}

		const success = FluxCore.scpFlux(this.shell, `/home/guest`);
		if (!success) {
			print("<color=red>Failed to scp flux to target!</color>");
			return false;
		}

		FluxCore.raw.sessionPath.push(this);
		const res = this.shell.launch(`/home/guest/${basename(programPath())}`, launchParams);
		if (isType(res, "string")) print(res.color("red"));
		FluxCore.raw.sessionPath.pop();

		if (FluxCore.raw.exiting)
			exit("");
		return true;
	}

	kill(): boolean {
		if (this.isHome) {
			print("You can't kill your home session!");
			return false;
		}

		if (FluxCore.currSession().id === this.id) {
			print("You can't kill the current session!");
			return false;
		}

		if (this.isRshellClient) {
			const procs = slice(this.computer.showProcs().split(char(10)), 1);
			for (const item of procs) {
				const parsedItem = item.split(" ");
				const pid = parsedItem[1]?.toInt();
				const name = parsedItem[4];
				// TODO: check correct user

				if (name != "rshell_client") continue;
				if (!isType(pid, "number")) {
					print("<color=red>Failed to close rshell_client: failed to parse the show_procs");
					continue;
				}

				const res = this.computer.closeProgram(pid);
				if (!isType(res, "string")) break;

				print("<color=red>Failed to close rshell_client: " + res);
			}
		}

		if (this.apt && Object.hasOwn(FluxShell.raw.env, "HACKSHOP_IP")) {
			this.apt.delRepo(FluxShell.raw.env["HACKSHOP_IP"] as string);
		}

		Object.remove(FluxCore.raw.sessions, this.id);

		return true;
	}

	loadLibs() {
		if (!this.apt) this.apt = requireLib("aptclient.so");
		if (!this.metax) this.metax = requireLib("metaxploit.so");
		if (!this.crypto) this.crypto = requireLib("crypto.so");
	}

	resolvePath(path: string) {
		return resolvePath(this.workingDir, path);
	}

	homeDir() {
		if (this.user === "root") return "/root";
		return "/home/" + this.user;
	}
}