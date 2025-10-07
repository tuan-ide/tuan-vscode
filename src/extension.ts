import * as vscode from "vscode";
import { TuanGraphView } from "./graph-view/TuanGraphView";

export function activate(context: vscode.ExtensionContext) {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage("No workspace folder is open");
		return;
	}

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TuanGraphView.viewId,
			new TuanGraphView(workspaceFolder),
		),
	);
}

export function deactivate() {}
