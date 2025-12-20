import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const config = {
	entryFile: "src/index.ts",
	outputFileName: "", // If empty it will be the same as the entry file, just with .gs extension
	createInGame: false,
}

const entryPath = path.resolve(process.cwd(), config.entryFile);
const entryBaseName = path.basename(entryPath, ".ts");

if (!config.outputFileName)
	config.outputFileName = entryBaseName + ".gs";

if (!fs.existsSync(entryPath)) {
	console.error(`File ${entryPath} doesn't exist.`);
	process.exit(2);
}

exec(`npx greyts transpile ${config.entryFile}`, (err, stdout, stderr) => {
	if (stderr) console.error(stderr);
	if (stdout) console.log(stdout);
	if (err) console.error(err);
})

let greybelCommand = `npx greybel-js build out/output.gs out -dbf -of ${config.outputFileName}`;
if (config.createInGame)
	greybelCommand += " -ci";

exec(greybelCommand, (err, stdout, stderr) => {
	if (stderr) console.error(stderr);
	if (stdout) console.log(stdout);
	if (err) console.error(err);
})