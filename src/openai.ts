import * as vscode from "vscode";
import { createOpenAI } from "@ai-sdk/openai";
import { CoreMessage, streamText } from "ai";

const getText = async (value: vscode.Location) => {
    const document = await vscode.workspace.openTextDocument(value.uri)
    const line = document.lineAt(value.range.start.line)
    return `
## ${document.fileName}: ${value.range.start.line + 1} - ${value.range.start.character + 1}
\`\`\`
${line.text}
\`\`\
\`\`\`
${document.getText(value.range)}
\`\`\`
`
}

const getFile = async (value: vscode.Uri) => {
    const document = await vscode.workspace.openTextDocument(value)
    return `
## ${document.fileName}
\`\`\`
${document.getText()}
\`\`\`
`
}

const resolveReferences = async (
    references: readonly vscode.ChatPromptReference[]
) => {
    const files: string[] = []
    const vars: Record<string, string> = {}
    for (const reference of references) {
        const { id, value } = reference
        if (typeof value === "string") vars[id] = value
        else if (value instanceof vscode.Uri)
            files.push(await getFile(value))
        else if (value instanceof vscode.Location)
            files.push(await getText(value))
    }

    let contextPrompt = ""
    if (files.length > 0) {
        contextPrompt = files.join("\n")
    }
    if (Object.keys(vars).length > 0) {
        contextPrompt += Object.entries(vars)
            .map(([key, value]) => `## ${key}\n${value}`)
            .join("\n")
    }

    return contextPrompt
}

const buildMessage = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext
): Promise<CoreMessage[]> => {
    const systemPrompt = vscode.workspace.getConfiguration("o1").get<string>("systemPrompt")
    const previousMessages: CoreMessage[] = context.history.map((h) =>
        h instanceof vscode.ChatRequestTurn
            ? { role: "user", content: h.prompt.substring(0, 100) + "..." }
            : { role: "assistant", content: `${h.response.at(-1)?.value}`.substring(0, 100) + "..." },
    )

    const userPrompt = `
## User Prompt
${request.prompt}
## END User Prompt

## References
${await resolveReferences(request.references)}
## END References
`

    if (systemPrompt) {
        return [
            ...previousMessages,
            { role: "user", content: userPrompt },
            { role: "assistant", content: systemPrompt },
        ]
    }

    return [
        ...previousMessages,
        { role: "user", content: userPrompt },
    ]
}

type InvakeOpenAI = {
    apiKey: string;
    systemPrompt?: string;
    request: vscode.ChatRequest;
    context: vscode.ChatContext;
    stream: vscode.ChatResponseStream;
    model: string;
}

export const invokeOpenAI = async ({
    apiKey,
    request,
    context,
    stream,
    model,
}: InvakeOpenAI) => {
    const messages = await buildMessage(request, context)
    const reasoningEffort = vscode.workspace.getConfiguration("o1").get<string>("reasoningEffort")

    const openai = createOpenAI({
        compatibility: "strict",
        apiKey,
    });
    const { textStream } = streamText({
        model: openai(model),
        experimental_telemetry: {
            isEnabled: false,
        },
        temperature: 0,
        messages,
        experimental_providerMetadata: {
            openai: {
                ...(reasoningEffort && { reasoningEffort: 'high' }),
            },
        },
    });

    for await (const textPart of textStream) {
        stream.markdown(textPart);
    }
}


export const handleChatError = (err: unknown, stream: vscode.ChatResponseStream) => {
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
