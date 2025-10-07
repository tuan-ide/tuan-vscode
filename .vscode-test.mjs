import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
	files: "out/tests/**/*.test.js",
	mocha: {
		timeout: 100000
	},
	workspaceFolder: "/Users/arthur-fontaine/Developer/code/github.com/arthur-fontaine/agrume",
});
