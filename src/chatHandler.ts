import * as vscode from "vscode";
import { handleChatError, invokeOpenAI } from "./openai";

export const chatHandler =
  (apiKey: string): vscode.ChatRequestHandler =>
    async (request, context, stream, _token) => {
      if (!apiKey) {
        vscode.window.showErrorMessage("OpenAI API Key is not set.");
        return;
      }

      try {
        stream.progress(vscode.l10n.t("I'm thinking..."));
        await invokeOpenAI({ apiKey, request, context, stream });
      } catch (err) {
        handleChatError(err, stream);
      }

      return { metadata: { command: "" } };
    };
