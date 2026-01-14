import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES, FluxShell } from "../shell/FluxShell";
import { updateLib } from "../utils/libokka";

const command = new Command({
	name: "update",
	description: "Updates the apt packages",
	category: "System Management",
})

command.run = function(_args, _options, process) {
	const session = FluxCore.currSession();
	if (!session.apt) {
		process.write(2, "Current session doesn't have apt loaded");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const hackshopIp = FluxShell.raw.env["HACKSHOP_IP"] as string | undefined;
	if (!hackshopIp) {
		process.write(2, "Environment variables doesn't have hackshop IP");
		return EXIT_CODES.GENERAL_ERROR;
	}

	const libs = ["crypto.so", "metaxploit.so", "aptclient.so"];
	// const sources = session.computer.file("/etc/apt/sources.txt");
	// if (!sources || str(sources.getContent()).indexOf(hackshopIp) === null) {
		
	// }

	session.apt.addRepo(hackshopIp);
	session.apt.update();

	for (const libName of libs) {
		let libPath = "/lib/" + libName;
		let lib = includeLib(libPath);
		if (!lib) {
			libPath = programPath() + "/" + libName;
			lib = includeLib(libPath);
		}

		if (!lib)
			continue;

		updateLib(libPath);
	}

	session.loadLibs();
	return EXIT_CODES.SUCCESS;
}