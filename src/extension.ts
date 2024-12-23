import * as vscode from "vscode";

import { chatHandler } from "./chatHandler";

const apiKeyKey = "openaiApiKey";

export async function activate(context: vscode.ExtensionContext) {
  const apiKey = await getApiKey(context);

  const o1Mini = vscode.chat.createChatParticipant("vscode-copilot.o1-mini", chatHandler(apiKey, "o1-mini"));
  o1Mini.iconPath = vscode.Uri.joinPath(context.extensionUri, "o1.webp");

  const o1 = vscode.chat.createChatParticipant("vscode-copilot.o1", chatHandler(apiKey, "o1"));
  o1.iconPath = vscode.Uri.joinPath(context.extensionUri, "o1.webp");

  const command = "o1.reset";
  async function commandHanndler() {
    await context.secrets.delete(apiKeyKey);
    await getApiKey(context);
  }
  context.subscriptions.push(vscode.commands.registerCommand(command, commandHanndler));
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
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

export function deactivate(context: vscode.ExtensionContext) {
  context.secrets.delete(apiKeyKey);
}
