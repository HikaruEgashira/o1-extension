import * as vscode from "vscode";
import { invokeOpenAI } from "./openai";

export const chatHandler =
  (apiKey: string): vscode.ChatRequestHandler =>
    async (request, context, stream, _token) => {
      if (!apiKey) {
        vscode.window.showErrorMessage("OpenAI API Key is not set.");
        return;
      }

      try {
        stream.progress(vscode.l10n.t("I'm thinking..."));

        const response = await invokeOpenAI({ apiKey, request, context });
        stream.markdown(response.text);
      } catch (err) {
        handleChatError(err, stream);
      }

      return { metadata: { command: "" } };
    };

function handleChatError(err: unknown, stream: vscode.ChatResponseStream): void {
  if (err instanceof vscode.LanguageModelError) {
    console.error(err.message, err.code, err.cause);
    if (err.cause instanceof Error) {
      stream.markdown(vscode.l10n.t("I'm sorry, I cannot process your text."));
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}
