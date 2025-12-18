const path = require("node:path");

/** @type {import('@rspack/cli').Configuration} */
module.exports = {
	entry: {
		extension: "./src/extension.ts",
		webview: "./src/graph-view/App.ts",
	},
	target: "node",
	mode: "production",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: [/node_modules/],
				loader: "builtin:swc-loader",
				options: {
					jsc: {
						parser: {
							syntax: "typescript",
						},
					},
				},
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
	},
	output: {
		filename: "[name].js",
		path: path.resolve(__dirname, "dist"),
		library: {
			type: "commonjs",
		},
	},
	externals: {
		vscode: "commonjs vscode",
		"@tuan/core-graph": "commonjs ../lib/@tuan/core-graph",
		"@tuan/core-labeler": "commonjs ../lib/@tuan/core-labeler",
	},
};
