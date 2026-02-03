import { formatColumnsf } from "../utils/libokka";

enum Direction {
	Up,
	Down,
	Left,
	Right
}

const gridWidth = 4 as const;

const grid: number[] = [];

function startGame() {
	for (let i = 0; i < gridWidth ** 2; i++) {
		grid.push(0);
	}

	spawnTile();
}

function gameOver(): never {
	exit("Game Over!");
}

function spawnTile() {
	const emptyIndexes: number[] = [];
	for (let i = 0; i < grid.length; i++) {
		if (grid[i] === 0) emptyIndexes.push(i);
	}

	if (!emptyIndexes.length)
		gameOver();

	emptyIndexes.shuffle();

	const nextTileIndex = emptyIndexes.shift()!;
	const nextTileValue = Math.random() < 0.5 ? 2 : 4;

	grid[nextTileIndex] = nextTileValue;
}

function moveTiles(direction: Direction) {
	const merged: number[] = [];

	if (direction === Direction.Up) {
		for (let i: number = gridWidth; i < grid.length; i++) {
			if (!grid[i] || merged.indexOf(i) !== null) continue;

			let newIndex = i;

			for (let j = 1; j <= Math.floor(i / gridWidth); j++) {
				const newI = i - gridWidth * j;
				if (newI < 0) break;
				if (grid[newI] === 0) {
					newIndex = newI;
				}
				else if (grid[newI] === grid[i] && merged.indexOf(newI) === null) {
					newIndex = newI;
					break;
				}
				else {
					break;
				}
			}

			if (newIndex !== i) {
				grid[newIndex] += grid[i];
				grid[i] = 0;
				if (grid[newIndex] / 2 === grid[i]) {
					merged.push(newIndex);
				}
			}
		}
	}
	else if (direction === Direction.Down) {
		for (let i = grid.length - gridWidth - 1; i >= 0; i--) {
			if (!grid[i] || merged.indexOf(i) !== null) continue;

			let newIndex = i;

			for (let j = 1; j <= Math.floor((grid.length - 1 - i) / gridWidth); j++) {
				const newI = i + gridWidth * j;
				if (newI >= grid.length) break;
				if (grid[newI] === 0) {
					newIndex = newI;
				}
				else if (grid[newI] === grid[i] && merged.indexOf(newI) === null) {
					newIndex = newI;
					break;
				}
				else {
					break;
				}
			}

			if (newIndex !== i) {
				grid[newIndex] += grid[i];
				grid[i] = 0;
				if (grid[newIndex] / 2 === grid[i]) {
					merged.push(newIndex);
				}
			}
		}
	}
	else if (direction === Direction.Left) {
		for (let i = 1; i < grid.length; i++) {
			if (!grid[i] || merged.indexOf(i) !== null) continue;
			if (i % gridWidth === 0) continue;

			let newIndex = i;

			for (let j = 1; j <= i % gridWidth; j++) {
				const newI = i - j;
				if (newI < 0 || Math.floor(newI / gridWidth) !== Math.floor(i / gridWidth)) break;
				if (grid[newI] === 0) {
					newIndex = newI;
				}
				else if (grid[newI] === grid[i] && merged.indexOf(newI) === null) {
					newIndex = newI;
					break;
				}
				else {
					break;
				}
			}

			if (newIndex !== i) {
				grid[newIndex] += grid[i];
				grid[i] = 0;
				if (grid[newIndex] / 2 === grid[i]) {
					merged.push(newIndex);
				}
			}
		}
	}
	else if (direction === Direction.Right) {
		for (let i = grid.length - 2; i >= 0; i--) {
			if (!grid[i] || merged.indexOf(i) !== null) continue;
			if ((i + 1) % gridWidth === 0) continue;

			let newIndex = i;

			for (let j = 1; j < gridWidth; j++) {
				const newI = i + j;
				if (newI >= grid.length || Math.floor(newI / gridWidth) !== Math.floor(i / gridWidth)) break;
				if (grid[newI] === 0) {
					newIndex = newI;
				}
				else if (grid[newI] === grid[i] && merged.indexOf(newI) === null) {
					newIndex = newI;
					break;
				}
				else {
					break;
				}
			}

			if (newIndex !== i) {
				grid[newIndex] += grid[i];
				grid[i] = 0;
				if (grid[newIndex] / 2 === grid[i]) {
					merged.push(newIndex);
				}
			}
		}
	}

	spawnTile();
}

const colorMap: Record<number, string> = {
	0: "#FFFFFF",
	2: "#6991cc",
	4: "#22863b",
	8: "#77405b",
	16: "#1c9797",
	32: "#5e5a8d",
	64: "#af66a3",
	128: "#6f00ff",
	256: "#004edf",
	512: "#00f7ff",
	1024: "#51ff00",
	2048: "#e5ff00",
	4096: "#eeff00",
	8192: "#ff00dd",
}

function colorize(value: number): string {
	const valueStr = value.toString();
	// if (valueStr.length < 5)
	// 	valueStr = valueStr.padRight(5 - valueStr.length, "§");
	const color = colorMap[value] ?? "#eeff00"

	return `<color=${color}>${valueStr}</color>`;
}

function printGrid() {
	console.clear();

	const rows: string[] = [];
	let row: string[] = [];
	for (let i = 0; i < grid.length; i++) {

		row.push(colorize(grid[i]));
		if (row.length === gridWidth) {
			rows.push(`<size=3em>${row.join("\t")}</size>`);
			row = [];
		}
	}

	console.log(formatColumnsf(rows, "left", true, { "§": "" }, 2));
}

startGame();

while (true) {
	printGrid();

	const key = userInput("", false, true);
	const keyCode = code(key);

	if (keyCode === 85 || keyCode === 119) // Up or W
		moveTiles(Direction.Up);
	else if (keyCode === 68 || keyCode === 115) // Down or S
		moveTiles(Direction.Down);
	else if (keyCode === 82 || keyCode === 100) // Right or D
		moveTiles(Direction.Right);
	else if (keyCode === 76 || keyCode === 97) // Left or A
		moveTiles(Direction.Left);
	else if (keyCode === 69) // Esc
		break;

	wait(0.1);
}