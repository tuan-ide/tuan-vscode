import * as vscode from "vscode";
import { TuanGraphView } from "./TuanGraphView";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TuanGraphView.viewId,
			new TuanGraphView(),
		),
	);
}

export function deactivate() {}
