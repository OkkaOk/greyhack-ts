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
// let { d, e } = o

class Test {
	constructor();
	constructor(asd?: any) {

	}
    
	hello(): number;
    hello(asd?: any): number | string {
        console.log("hello2")
		if (asd) 
			return ""
		else
			return 2
    }


	asd = function() {
		return 5;
	}
	asd2 = () => {

	}
}

abstract class Asd {
	abstract get value(): number;
}

class AAA extends Asd {
	override get value(): number {
		return 4
	}

	static set test(val: number) {

	}
}