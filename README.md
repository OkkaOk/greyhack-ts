
grey-ts-template
=================

A minimal template for creating GreyHack scripts and tools in TypeScript.

### Quickstart
1. Install dependencies: `npm install`
2. Write your scripts
3. Use `npm run build src/myEntryFile.ts` to transpile your code into greyscript.
   - You can change the output file's name by adding it to that command `npm run build src/myEntryFile.ts myOutput.gs`
4. You can now take the output file into the game
   - Alternatively use `npm run push` to use the `greybel-js` npm package to automatically push the file into the game.
     - You need the messagehook installed for this to work, see https://github.com/ayecue/greybel-js?tab=readme-ov-file#message-hook

### Development
- Write your source in `src/`.

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
