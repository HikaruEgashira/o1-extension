import * as vscode from "vscode";

import { chatHandler } from "./chatHandler";

export function activate(context: vscode.ExtensionContext) {
  const translate = vscode.chat.createChatParticipant("vscode-copilot.translate", chatHandler);

  translate.iconPath = vscode.Uri.joinPath(context.extensionUri, "bot.webp");
}

export function deactivate() {}
