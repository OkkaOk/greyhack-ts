import { Libex } from "../utils/libex";
import { resolvePath } from "../utils/libokka";

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
		this.id = md5(this.publicIp + this.localIp + this.user + this.isHome + this.isProxy + this.isRshellClient)

		this.workingDir = "/";

		this.userLevel = 0;
		if (this.user == "root") this.userLevel = 2;
		else if (this.user != "guest") this.userLevel = 1;

		this.metax = null;
		this.crypto = null;
		this.apt = null;
	}

	switchUser(username: string, password: string) {

	}

	connect(launchParams: string) {

	}

	kill(): boolean {
		return true
	}

	loadLibs() {

	}

	resolvePath(path: string) {
		return resolvePath(this.workingDir, path);
	}

	homeDir() {
		if (this.user === "root") return "/root";
		return "/home/" + this.user;
	}
}