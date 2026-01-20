// Regex usage
// const s1 = "Hello World";
// s1.matches(/World/);

// type Person = { name: string, gender: string, age: number }
// const arr: Person[] = [
// 	{ name: "kimmo", gender: "male", age: 60 },
// 	{ name: "ari", gender: "male", age: 58 },
// 	{ name: "jesus", gender: "male", age: 2025 },
// 	{ name: "???", gender: "???", age: 10000 }
// ];

// print(arr.find(person => {
// 	if (person.name === "kimmo")
// 		return false;
// 	if (person.age < 70)
// 		return false;
// 	return true;
// }));

// const res = arr.map((person) => person.name)
// print(res)

// print(arr.some(person => person.name === "ari"))
// print(arr.every(person => person.name === "ari"))
// print(arr.filter(person => person.age > 70))

// const weirdArr = [
// 	(() => 5),
// 	(() => "very weird"),
// ] as const

// const res = weirdArr[1]();

// print(lib.getDeviceId(getShell()))

// let tuple: [number, string, boolean] = [7, "hello", true];
// let [a, b, c] = tuple; // a: number, b: string, c: boolean

// let o = {
//   d: "foo",
//   e: 12,
//   f: "bar",
// };
// let { d, e } = o;
const lol = "ext";
class Test {
	private _myVal = 0;
	classID = "test";
	constructor(a?: any) {
	}

	get myVal() {
		return this._myVal * 2;
	}
}

class Ext extends Test {
	override classID = lol;
	test = 2;
}
const aa = new Ext(userInput);

// function outerFunc() {
// 	let counter = 0;
// 	function innerFunc() {
// 		counter += 1;
// 	}

// 	innerFunc();
// 	print(counter);
// }

// outerFunc();

const mylib = includeLib("/lib/metaxploit.so");
if (mylib?.classID === "MetaxploitLib") {
	print("hello");
}