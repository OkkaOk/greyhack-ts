import { FluxCore } from "../flux/core/FluxCore";
import { FluxShell } from "../flux/shell/FluxShell";
import type { CollectionData } from "../types/core";
import type { MetaLibVuln } from "../types/hacking";
import { ynPrompt } from "./libokka";

export class Libex {
	/** Returns a IP address where there is the given port open */
	static getIpWithPortOpen(portNumber: number, timeoutMs = 3000): string {
		if (!getShell().hostComputer.isNetworkActive()) return "";
		const octets = [0, 0, 0, 1] as [number, number, number, number];

		const start = time();
		while (true) {
			const ip = `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}`;
			const router = getRouter(ip);
			if (router) {
				const port = router.pingPort(portNumber);
				if (port && !port.isClosed()) return ip;
			}

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

			if (timeoutMs && (time() - start) * 1000 > timeoutMs)
				break;
		}

		return "";
	}

	/** Returns the user the computer object is logged in for */
	static computerPrivileges(computer: GreyHack.Computer): string {
		const rootFolder = computer.file("/root");
		if (rootFolder && rootFolder.hasPermission("w")) return "root";

		const homeFolder = computer.file("/home");
		if (!homeFolder) return "guest"; // Would be weird

		for (const userFolder of (homeFolder.getFolders() ?? [])) {
			if (userFolder.name === "guest") continue;
			if (userFolder.hasPermission("w"))
				return userFolder.name!;
		}

		return "guest";
	}

	static scanLib(metaLib: GreyHack.MetaLib, verbose = false): MetaLibVuln[] {
		const homeSession = FluxCore.raw.sessionPath[0];

		const vulns = FluxCore.raw.database.fetch("vulns", { library: metaLib.libName, version: metaLib.version });
		if (vulns.length) {
			FluxShell.mainProcess.write(1, `Vulnerabilities are known for ${metaLib.libName} ${metaLib.version}`.color("green"));
			return vulns;
		}

		if (!homeSession.metax) {
			FluxShell.mainProcess.write(2, `Couldn't scan ${metaLib.libName} as metaxploit wasn't loaded.`);
			return [];
		}

		const vulnerabilities: MetaLibVuln[] = [];

		FluxShell.mainProcess.write(1, `Scanning library: ${metaLib.libName} ${metaLib.version}`.color("yellow"));
		const memAddresses = homeSession.metax.scan(metaLib);
		if (!memAddresses) {
			FluxShell.mainProcess.write(2, `Failed to scan ${metaLib.libName} for some reason`);
			return [];
		}

		for (const address of memAddresses) {
			const info = homeSession.metax.scanAddress(metaLib, address)!;
			if (verbose) FluxShell.mainProcess.write(1, `${address}\\n${info}`);

			const segments = slice(info.split("Unsafe check: "), 1);
			for (const segment of segments) {
				const labelStart = segment.indexOf("<b>")!;
				const labelEnd = segment.indexOf("</b>")!;
				const hasRequirements = segment.indexOf("*") !== null;

				const unsecZone = slice(segment, labelStart + 3, labelEnd);

				const vuln: MetaLibVuln = {
					library: metaLib.libName,
					version: metaLib.version,
					address,
					unsecZone,
					type: "",
					permission: "",
					hasRequirements,
				};

				FluxCore.raw.database.insert("vulns", vuln);

				vulnerabilities.push(vuln);
			}
		}

		return vulnerabilities;
	}

	static exploitLib(publicIp: string, metaLib: GreyHack.MetaLib, lanTarget = "", verbose = false) {
		if (!isType(metaLib, "MetaLib")) {
			FluxShell.mainProcess.write(2, "<b>Invalid library given");
			return;
		}

		const vulns = this.scanLib(metaLib, verbose);
		for (const vuln of vulns) {
			this.exploitVulnerability(publicIp, metaLib, vuln, lanTarget, verbose);
		}

		// TODO: Maybe check if vuln was changed
		FluxCore.raw.database.modified = true;
	}

	static exploitVulnerability(publicIp: string, metalib: GreyHack.MetaLib, vuln: MetaLibVuln, lanTarget?: string, verbose = false) {
		let optArg = "fluxed";
		if (lanTarget) optArg = lanTarget;

		let result = metalib.overflow(vuln.address, vuln.unsecZone, optArg);
		if (!result && isValidIp(optArg)) {
			if (verbose) FluxShell.mainProcess.write(1, `<color=yellow>Overflow failed. Retrying...`);
			result = metalib.overflow(vuln.address, vuln.unsecZone, "fluxed");
		}

		if (!vuln.type) vuln.type = getType(result);

		if (isType(result, "file")) {
			this.handleFile(publicIp, result);
			vuln.permission = result.owner!;
		}
		else if (isType(result, "computer")) {
			this.handleComputer(result);
			vuln.permission = this.computerPrivileges(result);
		}
		else if (isType(result, "shell")) {
			const computer = result.hostComputer;
			this.handleComputer(computer);

			const user = this.computerPrivileges(computer);
			vuln.permission = user;

			const session = FluxCore.createSession(result);
			if (verbose && !session) {
				FluxShell.mainProcess.write(1, `<color=green>Shell obtained for ${computer.localIp}</color>`);
			}
			else if (verbose && session) {
				FluxShell.mainProcess.write(1, `<color=yellow>Shell obtained for ${computer.localIp} but we already have an identical or a better one. </color>`);
			}
		}

		if (vuln.permission !== "" && vuln.permission !== "guest" && vuln.permission !== "root") {
			vuln.permission = "user";
		}
	}

	static corruptLog(device: GreyHack.Computer | GreyHack.Shell, promptFileDeletion = false): true | string {
		if (isType(device, "shell")) device = device.hostComputer;

		// Check that /var/ exists and that we have permission for it
		const varFolder = device.file("/var");
		if (!varFolder) return "/var doesn't exist";
		if (!varFolder.hasPermission("w")) return "No write permissions to /var";

		if (promptFileDeletion) {
			const input = ynPrompt("Delete the current script as well?", "y");
			if (input === "y") device.file(programPath())!.delete();
		}

		const sysLog = device.file("/var/system.log");
		if (!sysLog) return "system.log was missing";
		if (!sysLog.hasPermission("w")) return "No write permission to /var/system.log";

		// Create temporary "log" file were corrupting/replacing the original with
		const touchRes = device.touch("/var", "system.tmp");
		if (isType(touchRes, "string")) return touchRes;

		// Replace system.log with the temporary file
		const tmpFile = device.file("/var/system.tmp")!;
		const contentLines = ["Lwv'b bpqvs gwc kiv pqlm nzwu bpmu.", "Bpmg'zm iteiga eibkpqvo, iteiga eiqbqvo."];
		tmpFile.setContent(contentLines.join(char(10)));
		const result = tmpFile.move("/var", "system.log");

		if (isType(result, "null")) return "Temporary log file got deleted for some reason!";
		if (isType(result, "string")) return result;

		return true;
	}

	private static handleFile(publicIp: string, file: GreyHack.File | null) {
		if (!isType(file, "file")) return;

		if (file.isFolder()) {
			for (const subFolder of file.getFolders()!) {
				this.handleFile(publicIp, subFolder);
			}
			for (const subFile of file.getFiles()!) {
				this.handleFile(publicIp, subFile);
			}
		}

		if (file.name === "Mail.txt") this.collectFileData(publicIp, file, "mails");
		if (file.name === "Bank.txt") this.collectFileData(publicIp, file, "banks");
		if (file.name === "passwd") this.collectFileData(publicIp, file, "users");
	}

	private static handleComputer(computer: GreyHack.Computer, createSession = false) {
		this.handleFile(computer.publicIp, computer.file("/"));
		if (!createSession) return;

		FluxCore.createSession(computer);
	}

	private static collectFileData(publicIp: string, file: GreyHack.File, dataKey: keyof CollectionData) {
		if (!FluxCore.raw.data[publicIp]) {
			FluxCore.raw.data[publicIp] = {
				banks: {},
				mails: {},
				users: {}
			};
		}

		const networkData = FluxCore.raw.data[publicIp];

		const content = file.getContent();
		if (!content) return;

		const lines = content.split(/\n/);
		for (const line of lines) {
			const parts = line.split(":");
			if (!parts || parts.length < 2) continue;

			const user = parts[0];
			const hash = parts[1];

			if (networkData[dataKey][user])
				continue;

			const deciphered = FluxCore.decipher(hash);
			if (!deciphered) continue;

			networkData[dataKey][user] = deciphered;

			if (dataKey === "mails") {
				const metaMail = mailLogin(user, deciphered);
				if (!isType(metaMail, "MetaMail")) continue;

				const mails = metaMail.fetch();
				if (isType(mails, "string")) continue;

				for (const mail of mails) {
					const segments = mail.split(char(10));
					// const mailId = slice(segments[2], 8);
					const mailFrom = slice(segments[3], 6);

					if (mailFrom.indexOf("no-reply") !== null) continue;

					if (networkData["mails"][mailFrom]) continue;
					networkData["mails"][mailFrom] = "";
				}
			}
		}
	}
}