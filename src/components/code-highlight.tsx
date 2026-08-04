const COMMENT_SOURCE = "//[^\\n]*|/\\*[\\s\\S]*?\\*/|<!--[\\s\\S]*?-->";
const LIQUID_SOURCE = "\\{%-?[\\s\\S]*?-?%\\}|\\{\\{-?[\\s\\S]*?-?\\}\\}";
const STRING_SOURCE = "`(?:\\\\.|[^`\\\\])*`|\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'";
const NUMBER_SOURCE = "\\b\\d+(?:\\.\\d+)?\\b";
const KEYWORD_SOURCE =
  "\\b(?:const|let|var|function|async|await|return|if|else|for|while|import|export|from|default|class|extends|new|this|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|switch|case|break|continue|interface|type|enum|public|private|readonly|static|as|in|of|model|generator|datasource)\\b";
const TAG_SOURCE = "</?[A-Za-z][\\w.-]*";

const TOKEN_PATTERN = new RegExp(
  `(?<comment>${COMMENT_SOURCE})|(?<liquid>${LIQUID_SOURCE})|(?<string>${STRING_SOURCE})|(?<number>${NUMBER_SOURCE})|(?<keyword>${KEYWORD_SOURCE})|(?<tag>${TAG_SOURCE})`,
  "g",
);

const CLASS_MAP: Record<string, string> = {
  comment: "text-white/35 italic",
  liquid: "text-fuchsia-300",
  string: "text-emerald-300",
  number: "text-orange-300",
  keyword: "text-sky-300",
  tag: "text-rose-300",
};

interface Token {
  text: string;
  className?: string;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ text: code.slice(lastIndex, index) });
    const groups = match.groups ?? {};
    const type = Object.keys(groups).find((key) => groups[key] !== undefined);
    tokens.push({ text: match[0], className: type ? CLASS_MAP[type] : undefined });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < code.length) tokens.push({ text: code.slice(lastIndex) });
  return tokens;
}

function tokensToLines(tokens: Token[]): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part, className: token.className });
    });
  }
  return lines;
}

export function CodeBlock({ code }: { code: string }) {
  const lines = tokensToLines(tokenize(code));
  return (
    <div className="font-mono text-xs leading-relaxed">
      {lines.map((lineTokens, i) => (
        <div key={i} className="flex">
          <span className="w-9 shrink-0 select-none pr-3 text-right text-white/20">{i + 1}</span>
          <span className="whitespace-pre text-white/90">
            {lineTokens.length === 0
              ? " "
              : lineTokens.map((token, j) => (
                  <span key={j} className={token.className}>
                    {token.text}
                  </span>
                ))}
          </span>
        </div>
      ))}
    </div>
  );
}
