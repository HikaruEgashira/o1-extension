import {
  type BasePromptElementProps,
  PromptElement,
  type PromptSizing,
  UserMessage,
  AssistantMessage,
} from "@vscode/prompt-tsx";

export interface PromptProps extends BasePromptElementProps {
  userQuery: string;
}

export class TranslatePrompt extends PromptElement<PromptProps, void> {
  render(_state: undefined, _sizing: PromptSizing) {
    return (
      <>
        <AssistantMessage>
          You are a translator.
          If given English text, translate in Japanese.
          Else if given text in any other language, translate in English.
          Output only the result.
        </AssistantMessage>
        <UserMessage>{this.props.userQuery}</UserMessage>
      </>
    );
  }
}
