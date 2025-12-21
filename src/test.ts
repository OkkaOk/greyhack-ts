// let asd: string | string[] = rnd() < 0.5 ? "" : [""];
// asd!.length

type Test = {
	test?: {
		text: string
	}
	func?: (val: string) => string
}

const myobj: Test = {

}

// myobj.test = {
// 	text: "hello"
// }

const bb = myobj.test ?? "unknown"
// let cc = myobj.test || "unknown"

let cc = null
cc ??= "hehe"

print(bb)
print(cc)

let arr: string[] = []
if ("tee" in arr) {
	arr.tee
}