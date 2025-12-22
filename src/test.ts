// Regex usage
// s2.matches(/World/);
// /World/.test(s2);

// const obj1 = { a: 1, b: 2 };

// const weird = {
//   len() { return 0; },
//   length: "oops"
// };

// const s1 = "asdasd"
// if (typeof s1 === "string") {
//   s1.length;
// }

// const maybe = rnd() < 0.5;
// const obj = maybe ? { asd: 5 } : {};
const obj = { mykey: 4 }

const obj3 = {
	value: "lolvalue",
	"0": "This will be replaced",
	getLen() {
		return this.value.length;
	},
	get test(): string {
		return this.value;
	},
	teeeest: function() {
		return 5
	},
	...obj,
	...{ asd: 5, ...{ btest: 4 } },
	// ...(maybe ? { asd: 5, ...{ atest: 4 } } : {}),
	...[1,2,3],
};

const test1 = { key1: 1 }
const test2 = { key2: 1 }
Object.assign(test1, test2)

const test = []

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

const myarr = [1,2,3,4,...[5,6,7,...[8,9,10,11,12,...[13,14,15],16,17]]]

// const res = weirdArr[1]();

print(obj3)