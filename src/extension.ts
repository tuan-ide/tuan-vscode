import * as vscode from "vscode";
import { TuanGraphView } from "./graph-view/TuanGraphView";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TuanGraphView.viewId,
			new TuanGraphView(),
		),
	);
}

export function deactivate() {}
