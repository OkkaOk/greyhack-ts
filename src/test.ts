// Regex usage
// s2.matches(/World/);
// /World/.test(s2);

// import * as lib from "./utils/libokka";

// const obj1 = { a: 1, b: 2 };

// const weird = {
//   len() { return 0; },
//   length: "oops"
// };

// const s1 = "asdasd"
// if (typeof s1 === "string") {
//   s1.length;
// }

// const obj = { mykey: 4 }

// const obj3 = {
// 	value: "lolvalue",
// 	"0": "This will be replaced",
// 	...obj,
// 	...{ asd: 5, ...{ btest: 4 } },
// 	// ...(maybe ? { asd: 5, ...{ atest: 4 } } : {}),
// 	...[1,2,3],
// 	what: (val: string) => {
// 		print(val)
// 	},
// 	whoo: function() {
// 		this.btest
// 	}
// };

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

// function myExisting(o: any) {

// }
// myExisting({
// 	hahaNo() {
// 		return 6
// 	},
// 	hahaStillNo: function() {
// 		return 6
// 	}
// })

// const weirdArr = [
// 	(() => 5),
// 	(() => "very weird"),
// ] as const

// const myarr = [1,2,3,4,...[5,6,7,...[8,9,10,11,12,...[13,14,15],16,17]]]

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

function deleteFile(arr: any[] | string, arr2?: string[]) {
	print(arr.length);
	print(arr2?.length);
	print(arr2?.["length"]);
}
const file = getShell().hostComputer.file("/")!;