import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";

const md = new Marked();
md.use(markedTerminal({ reflowText: false, tab: 2, emoji: false, showSectionPrefix: false }));

export function renderMarkdown(text) {
  try {
    return md.parse(text).replace(/\s+$/, "");
  } catch {
    return text;
  }
}
