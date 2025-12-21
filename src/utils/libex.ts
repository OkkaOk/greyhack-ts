export class Libex {
	/** Returns a IP address where there is the given port open */
	static getIpWithPortOpen(portNumber: number, timeoutMs = 3000): string {
		if (!getShell().hostComputer.isNetworkActive()) return "";
		const octets = [0, 0, 0, 1];

		const start = time();
		while (true) {
			const ip = `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}`;
			const router = getRouter(ip);
			if (router) {
				const port = router.pingPort(portNumber);
				if (port && !port.isClosed()) return ip;
			}

			octets[0]! += 1;
			if (octets[0]! > 255) {
				octets[1]! += 1;
				octets[0] = 0;
			}
			if (octets[1]! > 255) {
				octets[2]! += 1;
				octets[1] = 0;
			}
			if (octets[2]! > 255) {
				octets[3]! += 1;
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
}