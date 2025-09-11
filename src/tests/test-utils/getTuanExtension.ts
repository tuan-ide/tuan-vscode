import * as vscode from "vscode";

export function getTuanExtension(): vscode.Extension<unknown> | undefined {
	return vscode.extensions.all.find(
		(e) => e.packageJSON?.name === "tuan-vscode",
	);
}
