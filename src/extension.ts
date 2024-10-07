import * as vscode from "vscode";

import { chatHandler } from "./chatHandler";

export async function activate(context: vscode.ExtensionContext) {
  const apiKey = await getApiKey(context);
  const o1 = vscode.chat.createChatParticipant("vscode-copilot.o1-mini", chatHandler(apiKey));
  o1.iconPath = vscode.Uri.joinPath(context.extensionUri, "o1-mini.webp");
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
  const apiKeyKey = "openaiApiKey";
  const apiKey = await context.secrets.get(apiKeyKey);
  if (apiKey) {
    return apiKey;
  }

  const value = await vscode.window.showInputBox({ prompt: "Enter your OpenAI API Key" });
  if (value) {
    context.secrets.store(apiKeyKey, value);
    return value;
  }

  return await getApiKey(context);
}

export function deactivate() {}
