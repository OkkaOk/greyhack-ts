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

// class Test {
// 	private _myVal = 0;
// 	constructor(a?: any) {
// 	}

// 	get myVal() {
// 		return this._myVal * 2;
// 	}
// }
// const aa = new Test(userInput);

// function outerFunc() {
// 	let counter = 0;
// 	function innerFunc() {
// 		counter += 1;
// 	}

// 	innerFunc();
// 	print(counter);
// }

// outerFunc();

const myArr = [1, 2, 3] as const
const myArr2 = [1, 2, 3]
// // const ab = new Test(...myArr, 1,3,6,72,1);

function asdasd(a: any, b = 5, c: any, ...rest: any[]) {

}

// let uninitialized: string;
Math.max(1,2,3,...myArr, 1, 2, 3)
const result = Math.max(...[1, 2, 3, 4, 5], ...myArr2, 1,2,3, ...myArr, 1,2,3, ...myArr2)
const result2 = Math.max(1, 2, 3, 4, 5)
asdasd(1,...myArr,3, ...myArr2, ...myArr2);

const myArr3 = [1,2,3].concat([4,5,6], [7,8])