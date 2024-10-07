import * as vscode from "vscode";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export interface IChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

export const chatHandler: ({
  apiKey,
  systemPrompt,
}: { apiKey: string; systemPrompt?: string }) => vscode.ChatRequestHandler =
  ({ apiKey, systemPrompt }) =>
  async (request, _context, stream, _token) => {
    if (!apiKey) {
      vscode.window.showErrorMessage("OpenAI API Key is not set.");
      return;
    }

    try {
      stream.progress(vscode.l10n.t("I'm thinking..."));

      const openai = createOpenAI({
        compatibility: "strict",
        apiKey,
      });
      const response = await generateText({
        model: openai("o1-mini"),
        prompt: request.prompt,
        system: systemPrompt,
        experimental_telemetry: {
          isEnabled: false,
        },
        temperature: 0,
        experimental_continueSteps: true,
      });
      stream.markdown(response.text);
    } catch (err) {
      handleChatError(err, stream);
    }

    return { metadata: { command: "" } };
  };

function handleChatError(err: unknown, stream: vscode.ChatResponseStream): void {
  // making the chat request might fail because
  // - model does not exist
  // - user consent not given
  // - quote limits exceeded
  if (err instanceof vscode.LanguageModelError) {
    console.error(err.message, err.code, err.cause);
    if (err.cause instanceof Error) {
      stream.markdown(vscode.l10n.t("I'm sorry, I cannot o1 your text."));
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}
