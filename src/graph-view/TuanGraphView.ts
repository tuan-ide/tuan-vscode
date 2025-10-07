import * as fs from "node:fs";
import * as vscode from "vscode";
import * as TuanGraph from '@tuan/core-graph';
import { AppChannel } from "./App";

export class TuanGraphView implements vscode.WebviewViewProvider {
	public static readonly viewId = "tuan.graph";
	private static readonly channel = vscode.window.createOutputChannel("Tuan");
	private workspacePath: string;

	constructor(workspaceFolder: vscode.WorkspaceFolder) {
		this.workspacePath = workspaceFolder.uri.fsPath;
	}

	async resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		token: vscode.CancellationToken,
	): Promise<void> {
		webviewView.webview.options = {
			enableScripts: true,
		};
		webviewView.webview.html = await this.getHtmlForWebview(
			webviewView.webview,
		);

		const appChannel = new AppChannel(webviewView);
		appChannel.onMessage(message => this.handleWebviewMessage(message));
	}

	private handleWebviewMessage(message: AppChannel.Message) {
		switch (message.type) {
			case "openFile": {
				const uri = vscode.Uri.file(message.path);
				const permanent = vscode.window.activeTextEditor?.document.uri.toString() === uri.toString()
				vscode.window.showTextDocument(uri, { preview: !permanent });
				break;
			}
			default: message.type satisfies never;
		}
	}

	private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
		return /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<title>Tuan Graph</title>
			</head>
			<body>
				<div id="app" style="width: 100%; height: 100vh;"></div>
				<script id="graph-data" type="application/json">
					${this.getGraph()}
				</script>
				<script type="module">
					globalThis.exports = {};
					${TuanGraphView.getMainModule()}
				</script>
				<script type="module">
					const { App } = exports;
					new App(document.getElementById('app'), document.getElementById('graph-data').textContent);
				</script>
			</body>
			</html>
		`;
	}

	private static getMainModule() {
		const webviewPath = require.resolve("./App");
		return fs.readFileSync(webviewPath, "utf8");
	}

	private getGraph() {
		const graph = TuanGraph.typescript.getGraph(this.workspacePath);
		graph.positioning();

		TuanGraphView.channel.appendLine(JSON.stringify(graph.describe(), null, 2));

		return JSON.stringify(graph.describe());
	}
}
