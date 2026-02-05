interface BaseDBSchema {
	[tableName: PropertyKey]: Record<string, any>;
};

type QueryOperator = "$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte" | "$contains";

type Query<T> = {
	[K in keyof T]?: T[K] | { [OP in QueryOperator]?: T[K] };
};

interface DBTableType {
	name: PropertyKey;
	rows: any[];
	primaryKey: PropertyKey | undefined;
}

class DBHelper {
	static rowMatchesQuery(row: Record<string, any>, query: Query<any>): boolean {
		for (const key of Object.keys(query)) {
			if (!(key in row)) return false;
			const value = row[key];
			const qvalue = query[key] as string | { [OP in QueryOperator]?: any };

			if (!isType(qvalue, "map")) {
				if (value !== qvalue) return false;
				continue;
			}

			for (const op of Object.keys(qvalue)) {
				if (op === "$ne" && value === qvalue[op]) return false;
				if (op === "$eq" && value !== qvalue[op]) return false;
				if (op === "$gt" && value <= qvalue[op]) return false;
				if (op === "$gte" && value < qvalue[op]) return false;
				if (op === "$lt" && value >= qvalue[op]) return false;
				if (op === "$lte" && value > qvalue[op]) return false;
				if (op === "$contains" && Object.indexOf(value, qvalue[op]) === null) return false;
			}
		}

		return true;
	}

	static createSource(computer: GreyHack.Computer, randomName: string, folder: string, contentLines: string[], out: GreyHack.File[]): boolean {
		if (!contentLines.length) return true;

		const content = contentLines.join(char(10));
		const fileName = `${randomName}-bucket-${str(out.length)}.src`;

		let res: any = computer.touch(folder, fileName);
		if (isType(res, "string")) {
			console.log(`<color=red>Failed to create source file: ${res}`);
			return false;
		}

		const srcFile = computer.file(`${folder}/${fileName}`)!;
		res = srcFile.setContent(content);
		if (isType(res, "string")) {
			console.log(`<color=red>Failed to set source file content: ${res}`);
			return false;
		}

		out.push(srcFile);
		return true;
	}

	// static handleMigrations(gco: any) {

	// }
}

class DBTable implements DBTableType {
	classID = "dbtable";
	name: PropertyKey;
	rows: any[];
	funcs: (() => string[])[];
	kIndex: Record<PropertyKey, Record<any, number[]>>;
	primaryKey: PropertyKey | undefined;
	temporary = false;

	constructor(name: PropertyKey, primaryKey?: PropertyKey) {
		this.name = name;
		this.rows = [];
		this.funcs = [];
		this.primaryKey = primaryKey;
		this.kIndex = {};
	}

	setIndex(row: any, index: number) {
		for (const key of Object.keys(row)) {
			this.kIndex[key] ??= {};

			const colValue = row[key];

			this.kIndex[key][colValue] ??= [];
			this.kIndex[key][colValue].push(index);
		}
	}

	calculateIndexes(): boolean {
		this.kIndex = {};

		for (let i = 0; i < this.rows.length; i++) {
			this.setIndex(this.rows[i], i);
		}

		return true;
	}

	/** Gets the indexes for the rows that match the query */
	getRowIndexes(query: Query<any>): number[] {
		if (!this.rows.length) return [];

		for (const key of Object.keys(query)) {
			if (!this.kIndex[key]) continue;

			const colValueIndexes = this.kIndex[key];
			const value = query[key];

			if (colValueIndexes[value]) {
				return colValueIndexes[value];
			}
		}

		// No indexes found, return all indexes
		return range(0, this.rows.length - 1);
	}
}

export class GreyDB<Schema = BaseDBSchema> {
	classID = "database";
	shell: GreyHack.Shell;
	folder = "/home/guest/database";
	logLevel = 3;
	tables: Record<keyof Schema, DBTable>;
	owner: { name: string; passwordHash: string; };

	modified = false;

	dbVersion = 1;
	binaryCode = [
		'if params.len == 0 then exit("<color=red>No params given!")',
		'token = params.pull()',
		'if md5(obj.owner.name + obj.owner.passwordHash) != token then',
		'	exit("<color=red>Invalid password!")',
		'end if'
	].join(char(10));

	constructor(shell?: GreyHack.Shell) {
		this.shell = shell ?? getShell();

		this.tables = {} as any;
		this.owner = { name: "", passwordHash: "" };
	}

	print(value: any, logLevel: number) {
		if (this.logLevel < logLevel) return;
		console.log(value);
	}

	hasTable(tableName: string): boolean {
		return tableName in this.tables;
	}

	addTable<Name extends keyof Schema>(
		tableName: Name,
		primaryKey?: keyof Schema[Name]
	): boolean {
		if (tableName in this.tables) {
			this.tables[tableName].primaryKey = primaryKey;
			return true;
		}

		const newTable = new DBTable(tableName, primaryKey);
		this.modified = true;
		this.tables[tableName] = newTable;

		return true;
	}

	deleteTable<Name extends keyof Schema>(tableName: Name) {
		if (!Object.hasOwn(this.tables, tableName)) return false;

		this.modified = true;
		Object.remove(this.tables, tableName);
		return true;
	}

	insertRaw<Name extends keyof Schema>(tableName: Name, row: any) {
		const table = this.tables[tableName];
		const primaryKey = table.primaryKey;

		if (primaryKey && table.kIndex[primaryKey] && row[primaryKey] in table.kIndex[primaryKey]) {
			const index = table.kIndex[primaryKey][row[primaryKey]][0];
			table.rows[index] = row;
		}
		else {
			const index = table.rows.length;
			table.rows.push(row);
			table.setIndex(row, index);
		}

		this.modified = true;
	}

	insert<Name extends keyof Schema>(tableName: Name, row: Schema[Name]) {
		const primaryKey = this.tables[tableName].primaryKey;
		if (primaryKey && !Object.hasOwn(row, primaryKey)) {
			this.print(`<color=red>Given row for table '${tableName as string}' doesn't have the primary key: ${primaryKey as string}`, 1);
			return false;
		}

		this.insertRaw(tableName, row);
		return true;
	}

	fetch<Name extends keyof Schema>(tableName: Name, query?: Query<Schema[Name]>, limit?: number): Schema[Name][] {
		if (!Object.hasOwn(this.tables, tableName)) return [];

		const table = this.tables[tableName];
		if (limit && limit <= 0) return [];

		if (!query) query = {};
		if (!Object.size(query)) return table.rows.slice(0, limit);

		const output: Schema[Name][] = [];
		for (const index of table.getRowIndexes(query)) {
			const row = table.rows[index];

			if (DBHelper.rowMatchesQuery(row, query)) {
				output.push(row);
				if (limit && output.length >= limit) return output;
			}
		}

		return output;
	}

	fetchOne<Name extends keyof Schema>(tableName: Name, query?: Query<Schema[Name]>): Schema[Name] | null {
		const arr = this.fetch(tableName, query, 1);
		if (!arr.length) return null;

		return arr[0];
	}

	/** Remove rows that match the query
	 * @returns The number of rows removed
	 */
	remove<Name extends keyof Schema>(tableName: Name, query?: Query<Schema[Name]>, limit?: number): number {
		const table = this.tables[tableName];
		if (!table) return 0;
		if (!table.rows.length) return 0;
		if (!query) query = {};

		let removed = 0;
		for (const index of table.getRowIndexes(query).sort(null, false)) {
			if (limit && removed >= limit)
				break;

			const row = table.rows[index];

			if (DBHelper.rowMatchesQuery(row, query)) {
				removed += 1;
				table.rows.remove(index);
			}
		}

		if (removed > 0) {
			table.calculateIndexes();
			this.modified = true;
		}

		return removed;
	}

	/** Saves the database content to its files
	 * @param force Should it save the even though no modifications were made */
	save(force?: boolean): boolean {
		if (!this.owner.name) {
			this.print("<color=red>You haven't logged in so you can't save the database!", 1);
			return false;
		}

		if (!this.modified && !force)
			return false;

		const computer = this.shell.hostComputer;
		const startTime = time();

		const rndName = md5(Math.random() + currentDate()).slice(0, 6);
		const rndSrc = rndName + ".src";
		const rndFullPath = this.folder + "/" + rndSrc;

		const res = computer.touch(this.folder, rndSrc);
		if (isType(res, "string")) {
			this.print("<color=red>Failed to save db: " + res, 1);
			return false;
		}

		const finalFile = computer.file(rndFullPath)!;
		finalFile.chmod("o-rwx");
		finalFile.chmod("g-rwx");
		finalFile.chmod("g+r");

		const finalFileContent: string[] = [];

		let srcFileContent: string[] = [];
		const srcFiles: GreyHack.File[] = [];

		for (const table of Object.values(this.tables)) {
			if (table.temporary) continue;

			srcFileContent.push(`obj.tables["${table.name as string}"] = {}`);
			srcFileContent.push(`t = obj.tables["${table.name as string}"]`);
			srcFileContent.push(`t.rows = []`);
			srcFileContent.push(`t.funcs = []`);

			if (table.primaryKey) {
				srcFileContent.push(`t.primaryKey = "${table.primaryKey as string}"`);
			}

			const arr = [table.rows];
			while (arr.length > 0) {
				const currArr = arr.shift()!;
				if (!currArr.length) continue;

				const currArrStr = str(currArr);
				if (currArrStr.length > 150000) {
					const halfway = Math.ceil(currArr.length / 2);
					arr.push(currArr.slice(0, halfway));
					arr.push(currArr.slice(halfway));
					continue;
				}

				srcFileContent.push([
					"loadFunc = function()",
					`	return ${currArrStr}`,
					"end function",
					"t.funcs.push(@loadFunc)"
				].join(char(10)));
				DBHelper.createSource(computer, rndName, this.folder, srcFileContent, srcFiles);
				srcFileContent = [];
			}
		}

		DBHelper.createSource(computer, rndName, this.folder, srcFileContent, srcFiles);

		finalFileContent.push([
			`get_custom_object["GreyDB"] = {}`,
			`obj = get_custom_object["GreyDB"]`,
			"obj.tables = {}",
			`obj.owner = ${this.owner}`,
			`obj.version = ${this.dbVersion}`,
			this.binaryCode
		].join(char(10)));

		for (const srcFile of srcFiles) {
			// Some bug in the game causes this to fail because it statically tries to import code there even though it's a string literal and not a call
			// This is a workaround which tricks it not to call it during compile
			const importCodeStr = "import" + "_" + "code";
			finalFileContent.push(`${importCodeStr}("${srcFile.path()}")`);
		}

		finalFile.setContent(finalFileContent.join(char(10)));
		const error = this.shell.build(finalFile.path(), this.folder, false);
		if (error) {
			this.print("<color=red>Failed to build the database: " + error, 1);
			return false;
		}

		const tempdb = computer.file(this.folder + "/" + rndName)!;
		const dbFile = computer.file(this.folder + "/" + this.owner.name);
		if (dbFile && tempdb) dbFile.delete();

		tempdb.rename(this.owner.name);
		tempdb.chmod("u+wrx");
		tempdb.chmod("g+wrx");
		tempdb.chmod("o-wrx");
		tempdb.setGroup("database");

		finalFile.delete();
		for (const srcFile of srcFiles) {
			srcFile.delete();
		}

		const tookMs = Math.round((time() - startTime) * 1000);
		if (tookMs > 600) {
			this.print(`<color=yellow>Warning: Saving the database took ${tookMs} ms. Consider using another account to lessen the load`, 2);
		}

		this.modified = false;
		return true;
	}

	/** 
	 * Login to your account so you can use your own tables 
	 * 
	 * If the account didn't exist, one will be created
	 */
	login(username: string, password: string): boolean {
		if (!username) {
			this.print("<color=red>You didn't give a username to login to", 1);
			return false;
		}

		if (!password) {
			this.print("<color=red>You didn't give a password", 1);
			return false;
		}

		if (username === this.owner.name) {
			this.print(`<color=red>You're already logged in as ${username}`, 1);
			return false;
		}

		const startTime = time();
		const computer = this.shell.hostComputer;

		computer.createGroup("root", "database");
		const homeFolder = computer.file("/home");
		if (homeFolder) {
			for (const userFolder of homeFolder.getFolders()!) {
				if (userFolder.name === "guest") continue;

				computer.createGroup(userFolder.name!, "database");
			}
		}

		const dbFolder = this.createDatabaseFolder();
		if (!dbFolder) {
			this.print("<color=red>Database folder is missing and couldn't create one!", 1);
			return false;
		}

		const dbFile = dbFolder.getFiles()!.find(file => file.isBinary() && file.name === username);

		if (!dbFile) {
			this.tables = {} as any;
			this.owner = {
				name: username,
				passwordHash: md5(password),
			};

			this.print("<color=green>Registered user " + username, 3);
			this.save(true);
			return true;
		}

		if (!dbFile.hasPermission("x")) {
			this.print("<color=red>This shell doesn't have 'execute' permission for database file at: " + dbFile.name, 1);
			return false;
		}

		const token = md5(username + md5(password));

		const launchRes = this.shell.launch(dbFile.path(), token);
		if (launchRes === false || isType(launchRes, "string")) {
			this.print("<color=red>Failed to use shell.launch to load the database", 1);
			return false;
		}

		if (!Object.hasOwn(getCustomObject(), "GreyDB")) return false;

		this.tables = {} as any;
		this.owner = getCustomObject()["GreyDB"]["owner"];

		const tables: typeof this.tables = getCustomObject()["GreyDB"]["tables"];
		for (const tableName of Object.keys(tables)) {
			const table = new DBTable(tableName);
			this.tables[tableName] = table;

			if (tables[tableName]?.primaryKey)
				table.primaryKey = tables[tableName].primaryKey;
			if (tables[tableName]?.rows)
				table.rows = tables[tableName].rows;

			if (tables[tableName]?.funcs) {
				for (const func of tables[tableName].funcs) {
					table.rows = table.rows.concat(func());
				}
			}

			table.calculateIndexes();
		}

		Object.remove(getCustomObject(), "GreyDB");

		const tookMs = Math.round((time() - startTime) * 1000);
		if (tookMs > 2000) {
			this.print(`<color=yellow>Warning: Loading the database took ${tookMs} ms. Consider using another account to lessen the load`, 2);
		}

		this.print("<color=green>Logged in to the database as " + username, 3);
		return true;
	}

	/** Change the password for the currently logged in user */
	changePassword(newPassword: string): boolean {
		if (!newPassword) {
			this.print("<color=red>You didn't give a password", 1);
			return false;
		}

		if (this.owner.name) {
			this.print("<color=red>You need to login to the account first.", 1);
			return false;
		}

		this.owner.passwordHash = md5(newPassword);
		this.save(true);
		return true;
	}

	private createDatabaseFolder(): GreyHack.File | null {
		const computer = this.shell.hostComputer;

		let dbFolder = computer.file(this.folder);
		if (!dbFolder) {
			let currPath = "/";

			for (const folderName of this.folder.split("/")) {
				if (!folderName) continue;

				currPath += folderName;
				if (!computer.file(currPath)) {
					const res = computer.createFolder(parentPath(currPath), folderName);
					if (isType(res, "string")) this.print(`<color=red>${res}`, 1);
				}

				currPath += "/";
			}

			dbFolder = computer.file(this.folder);
		}

		if (!dbFolder)
			return null;

		dbFolder.chmod("u+wrx", true);
		dbFolder.chmod("g+wrx", true);
		dbFolder.chmod("o-wrx", true);
		dbFolder.setGroup("database", true);

		return dbFolder;
	}
}
