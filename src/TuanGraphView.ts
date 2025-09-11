import type * as vscode from "vscode";

export class TuanGraphView implements vscode.WebviewViewProvider {
	public static readonly viewId = "tuan.graph";

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
				<h1>Hello from Tuan Graph!</h1>
			</body>
			</html>
		`;
	}
}
