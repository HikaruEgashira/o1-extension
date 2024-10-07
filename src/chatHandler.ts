import * as vscode from "vscode";
import { createOpenAI } from "@ai-sdk/openai";
import { CoreMessage, generateText } from "ai";

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
  async (request, context, stream, _token) => {
    if (!apiKey) {
      vscode.window.showErrorMessage("OpenAI API Key is not set.");
      return;
    }

    try {
      stream.progress(vscode.l10n.t("I'm thinking..."));

      const previousMessages: CoreMessage[] = context.history.map((h) =>
        h instanceof vscode.ChatRequestTurn
          ? { role: "user", content: h.prompt.substring(0, 100) + "..." }
          : { role: "assistant", content: `${h.response.at(-1)?.value}`.substring(0, 100) + "..." },
      );

      const openai = createOpenAI({
        compatibility: "strict",
        apiKey,
      });
      const response = await generateText({
        model: openai("o1-mini"),
        experimental_telemetry: {
          isEnabled: false,
        },
        temperature: 0,
        experimental_continueSteps: true,
        messages: [
          { role: "assistant", content: systemPrompt ?? "" },
          ...previousMessages,
          { role: "user", content: request.prompt },
        ],
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
