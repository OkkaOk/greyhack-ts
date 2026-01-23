
grey-ts-template
=================

A minimal template for creating GreyHack scripts and tools in TypeScript.

### Quickstart
1. Install dependencies: `npm install`
2. Write your scripts
3. Edit the configuration in `index.js`
4. Use `npm run transpile` to transpile your code into greyscript.

### Notes
You need the messagehook installed for greybel-js to push the files into the game, see https://github.com/ayecue/greybel-js?tab=readme-ov-file#message-hook

### Development
Write your source in `src/`.

If you want to extend the primitive types with custom methods, in the game/greyscript you would just have to do:
```lua
string.myfunc = function()
	return "test"
end function
```

But here in TypeScript it's a 2 step process. First add the typing for that method in the `extensions.d.ts`:

```ts
interface String {
	myfunc(): string;
}
```

Then in your code, you implement the method like this:
```ts
String.prototype.myFunc = function() {
	return "test";
}
```

### License
- MIT — see LICENSE in the repository.
