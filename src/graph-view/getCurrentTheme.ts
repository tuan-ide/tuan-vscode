import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";

interface VsCodeTheme {
    include?: string;
    tokenColors: {
        scope: string | string[];
        settings: { background?: string; fontStyle?: string; foreground?: string };
    }[]
}

export function getCurrentTheme(): VsCodeTheme {
    const themeName = vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");

    const defaultThemesPath = path.resolve(vscode.extensions.all[0].extensionPath, "..", "theme-defaults", "themes");
    const defaultThemes = fs.readdirSync(defaultThemesPath).map(file => ({
        content: require(path.join(defaultThemesPath, file)),
        path: path.join(defaultThemesPath, file),
    }));

    let currentThemePath: string | undefined;

    for (const defaultTheme of defaultThemes) {
        if (themeName === defaultTheme.content.name) {
            currentThemePath = defaultTheme.path;
            break;
        }
    }

    if (currentThemePath === undefined) {
        for (const extension of vscode.extensions.all) {
            const themes = extension.packageJSON.contributes?.themes as { label: string; path: string }[] | undefined;
            const currentTheme = themes?.find((theme) => theme.label === themeName);
            if (currentTheme) {
                currentThemePath = path.join(extension.extensionPath, currentTheme.path);
                break;
            }
        }
    }

    assert(currentThemePath, `Could not find theme ${themeName}`);
    const theme = resolveTheme(currentThemePath);

    return theme;
}

function resolveTheme(themePath: string): VsCodeTheme {
    const theme: VsCodeTheme = require(themePath);
    if (theme.include) {
        const includePath = path.isAbsolute(theme.include)
            ? theme.include
            : path.join(path.dirname(themePath), theme.include);
        const parentTheme = resolveTheme(includePath);
        return {
            ...parentTheme,
            ...theme,
            tokenColors: [...(parentTheme.tokenColors || []), ...(theme.tokenColors || [])],
        };
    }
    return theme;
}
