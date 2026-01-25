import { getDeviceId } from "../../utils/libokka";
import { FluxCore } from "../core/FluxCore";
import { Command } from "../shell/Command";
import { EXIT_CODES, FluxShell } from "../shell/FluxShell";

const command = new Command({
	name: "rshell",
	description: "Manage reverse shell servers",
	category: "Networking",
	subcommands: [
		{
			name: "install",
			description: "Installs rshell service to the current server",
			requirements: {
				hasShell: true
			}
		},
		{
			name: "uninstall",
			description: "Uninstalls rshell service from the current server",
			requirements: {
				hasShell: true
			}
		},
	]
});

// Install
command.subcommands[0].run = function (_args, _options, process) {
	const session = FluxCore.currSession();
	session.loadLibs();

	function installRshellService() {
		let librshell = includeLib("/lib/librshell.so") as GreyHack.Service | null;
		if (librshell) return librshell;

		if (!session.apt) {
			process.write(2, "Couldn't find aptclient.so to install the service");
			return null;
		}

		const hackshopIp = FluxShell.raw.env["HACKSHOP_IP"] as string | null;
		if (!hackshopIp) {
			process.write(2, "No hackshop IP found!");
			return null;
		}

		session.apt.addRepo(hackshopIp);
		session.apt.update();
		const installResult = session.apt.install("librshell.so");
		if (isType(installResult, "string")) {
			process.write(2, installResult);
			return null;
		}

		librshell = includeLib("/lib/librshell.so") as GreyHack.Service | null;
		if (isType(librshell, "service")) {
			const output = librshell.installService();
			if (isType(output, "string")) {
				process.write(2, output);
				return null;
			}

			return librshell;
		}

		return null;
	}

	const deviceId = getDeviceId(session.computer);
	const row = FluxCore.raw.database.fetchOne("devices", { deviceId });
	if (!row || !row.isProxy) {
		process.write(2, "Reverse shell servers can only be added to servers that are your proxies.");
		process.write(2, "Add it with 'proxy add' command.");
		return EXIT_CODES.GENERAL_ERROR;
	}

	if (!installRshellService())
		return EXIT_CODES.GENERAL_ERROR;

	row.isRshellServer = true;
	process.write(1, "Server installed successfully! Remember to port forward!".color("green"));
	return EXIT_CODES.SUCCESS;
};

// Uninstall
command.subcommands[1].run = function (_args, _options, process) {
	const session = FluxCore.currSession();

	function uninstallRshellService() {
		let librshell = includeLib("/lib/librshell.so") as GreyHack.Service | null;
		if (!librshell) {
			process.write(2, "librshell.so doesn't exist on this computer");
			return false;
		}

		const stopResult = librshell.stopService();
		if (isType(stopResult, "string")) {
			process.write(2, `Stopping the service failed: ${stopResult}`);
			return false;
		}
		else {
			process.write(1, "Successfully stopped the librshell.so service");
		}

		const soFile = session.computer.file("/lib/librshell.so")!;
		const deleteResult = soFile.delete();
		if (deleteResult)
			process.write(2, deleteResult);

		return true;
	}

	if (!uninstallRshellService())
		return EXIT_CODES.GENERAL_ERROR;

	const deviceId = getDeviceId(session.computer);
	const row = FluxCore.raw.database.fetchOne("devices", { deviceId });
	if (row) row.isRshellServer = false;

	process.write(1, "Server uninstalled successfully!".color("green"));
	return EXIT_CODES.SUCCESS;
};