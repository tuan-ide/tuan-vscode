import * as fs from "node:fs";
process.env.NAPI_RS_NATIVE_LIBRARY_PATH="/Users/arthur-fontaine/Developer/code/github.com/tuan-ide/tuan-core/napi/tuan-graph/core-graph.darwin-arm64.node"
import * as TuanGraph from '@tuan/core-graph';
process.env.NAPI_RS_NATIVE_LIBRARY_PATH="/Users/arthur-fontaine/Developer/code/github.com/tuan-ide/tuan-core/napi/tuan-labeler/core-labeler.darwin-arm64.node"
import * as TuanLabeler from '@tuan/core-labeler'
import * as vscode from "vscode";
import { type App, AppChannel } from "./App";
import { getCurrentTheme } from "./getCurrentTheme";

export class TuanGraphView implements vscode.WebviewViewProvider {
	public static readonly viewId = "tuan.graph";
	private static readonly channel = vscode.window.createOutputChannel("Tuan");
	private workspacePath: string;

	private graph: TuanGraph.Graph = undefined!;
	private clusters: TuanGraph.Cluster[] = undefined!;
	private labeler: TuanLabeler.ProjectLabeler = undefined!;
	private clusterLabels: Map<TuanGraph.Cluster['id'], string> = new Map();

	constructor(workspaceFolder: vscode.WorkspaceFolder) {
		this.workspacePath = workspaceFolder.uri.fsPath;

		this.updateGraph();
		this.updateLabeler();
		this.updateLabels();

		TuanGraphView.channel.appendLine(JSON.stringify({
			graph: this.graph,
			clusters: this.clusters,
			labels: Object.fromEntries(this.clusterLabels),
		}));
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
					${JSON.stringify(this.describeGraph())}
				</script>
				<script id="theme-data" type="application/json">
					${JSON.stringify(this.getTheme())}
				</script>
				<script type="module">
					globalThis.exports = {};
					${TuanGraphView.getMainModule()}
				</script>
				<script type="module">
					const { App } = exports;
					new App(document.getElementById('app'), document.getElementById('graph-data').textContent, document.getElementById('theme-data').textContent);
				</script>
			</body>
			</html>
		`;
	}

	private static getMainModule() {
		const webviewPath = require.resolve("./App");
		return fs.readFileSync(webviewPath, "utf8");
	}

	private updateGraph() {
		const graph = TuanGraph.typescript.getGraph(this.workspacePath);
		graph.positioning();

		TuanGraphView.channel.appendLine(JSON.stringify(graph.describe(), null, 2));

		const clusters = graph.clusterize(100);

		this.graph = graph;
		this.clusters = clusters;
	}

	private describeGraph() {
		return {
			...this.graph.describe(),
			clusters: this.clusters,
			clusterLabels: Object.fromEntries(this.clusterLabels),
		};
	}

	private updateLabeler() {
		this.labeler = new TuanLabeler.ProjectLabeler(
			this.workspacePath,
			this.graph.nodes.map(node => node.filePath)
		);
	}

	private updateLabels() {
		const nodeIdToPathMap = new Map<number, string>();
		for (const node of this.graph.nodes) {
			nodeIdToPathMap.set(node.id, node.filePath);
		}

		for (const cluster of this.clusters) {
			const clusterFilePaths = cluster.members
				.map(member => nodeIdToPathMap.get(member))
				.filter(path => path !== undefined);

			const labels = this.labeler.labelFiles(clusterFilePaths);
			const sortedLabels = Object.entries(labels)
				.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
			TuanGraphView.channel.appendLine(`Cluster ${cluster.id}, files: ${JSON.stringify(clusterFilePaths)}, labels: ${JSON.stringify(sortedLabels)}`);
			const label = sortedLabels[0][0];

			this.clusterLabels.set(cluster.id, label)
		}
	}

	private getTheme(): Partial<App.Theme> {
		const { tokenColors } = getCurrentTheme();

		const colors = tokenColors
			.flatMap(tc => [tc.settings.background, tc.settings.foreground])
			.filter(tc => tc !== undefined);

		return {
			nodeColors: colors,
		}
	}
}
