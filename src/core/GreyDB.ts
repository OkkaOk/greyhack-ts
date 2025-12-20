type Query = {

};

class DBTable {
	classID = "dbtable";
	name: string;
	rowKeys: string[];
	kIndex: Record<string, Record<any, number[]>>;
	allowPartial?: boolean;
	primaryKey?: string;
	temporary = false;

	constructor(name: string, rowKeys: string[], allowPartial?: boolean, primaryKey?: string) {
		this.name = name;
		this.rowKeys = rowKeys;
		this.allowPartial = allowPartial;
		this.primaryKey = primaryKey;
		this.kIndex = {};
	}

	initIndexes() {

	}

	setIndex(row: any, index: number) {

	}

	calculateIndexes() {

	}

	getRowIndexes(query: Query) {

	}
}

export class GreyDB {
	classID = "database";
	shell: GreyHack.Shell | null = null;
	folder = "/home/guest/database";
	logLevel = 3;
	tables: Record<string, DBTable>;
	owner: { name: string; passwordHash: string; };

	modified = false;

	constructor(shell?: GreyHack.Shell) {
		if (shell) this.shell = shell;
		this.tables = {};
		this.owner = { name: "", passwordHash: "" };
	}

	print(value: any, logLevel: number) {
		if (this.logLevel < logLevel) return;
		print(value);
	}

	addTable(tableName: string, keys: string[], allowPartial?: boolean, primaryKey?: string) {
		if (primaryKey && keys.indexOf(primaryKey) == null) {
			this.print(`<color=red>The primary key for ${tableName} wasn't in the 'keys' array.`, 1);
			return false;
		}

		if (this.tables.hasIndex(tableName)) {
			this.tables[tableName].rowKeys = keys;
			this.tables[tableName].allowPartial = allowPartial;
			this.tables[tableName].primaryKey = primaryKey;
			this.tables[tableName].initIndexes();
			this.modified = true;
			return true;
		}

		const newTable = new DBTable(tableName, keys, allowPartial, primaryKey);
		this.modified = true;
		this.tables[tableName] = newTable;
		this.tables[tableName].initIndexes();

		return true;
	}

	deleteTable(tableName: string) {
		if (!this.tables.hasIndex(tableName)) return false;

		this.modified = true;
		this.tables.remove(tableName);
		return true;
	}

	getTable(tableName: string): DBTable | null {
		if (!this.tables.hasIndex(tableName)) {
			this.print(`<color=red>Table ${tableName} not found`, 1);
			return null;
		}

		return this.tables[tableName];
	}

	insertRaw(tableName: string, row: any) {

	}

	insert(tableName: string, row: any) {
		
	}

	fetch(tableName: string, query?: Query, limit?: number): any[] {
		return []
	}

	fetchOne(tableName: string, query?: Query): any | null {
		const arr = this.fetch(tableName, query, 1);
		if (!arr.length) return null;

		return arr[0];
	}

	remove(tableName: string, query?: Query, limit?: number): number {
		return 0
	}

	save(force?: boolean) {

	}

	login(username: string, password: string) {

	}

	changePassword(newPassword: string) {

	}
}