// dafeiyu (unofficial DeepSeek mascot, fan-community pixel art), 28x26 px, downscaled from the
// 49x52 original by per-block mode after cropping to the face. "." = transparent.
export const DAFEIYU = {
  palette: {
    a: "#1c334d",
    b: "#34488e",
    c: "#2f54af",
    d: "#176daf",
    e: "#3677d2",
    f: "#3caed8",
    g: "#858edd",
    h: "#cd9391",
    i: "#bd9da1",
    j: "#c5b2bc",
    k: "#7cc4ff",
    l: "#cecdd5",
    m: "#fcddd2",
    n: "#cfedf3",
    o: "#f6efe2",
    p: "#fdfbff",
    q: "#feffff",
  },
  rows: [
    ".............appaaaa........",
    ".........aaaappplplpa.......",
    "........appplaaplpppplpa....",
    ".......plppaaeeaaapplppp....",
    "......ppaaeeeeeeeeeeapplaa..",
    ".....apaeeeeeeeeeeeeealplp..",
    "....apaeeeeeeeeeeeeeeealppaa",
    "....paeeeeebekeeeeeeeealppae",
    "....aeeeekbekkkkkebeeeeellpp",
    "...eeeeeeebekkeekebeeeeelppa",
    "..eeeeeeeeeeeeeeeebeeeeealla",
    ".aebeeeeeaeeeeeeeeaeeeeebapp",
    ".abakeeeajeebeeeeajaeeeeealp",
    "aeaakkeejohebeebeaoaeeeeeaaa",
    ".aaeeeeaoaaabeebeaooaebeeefd",
    ".aaeeeeaaaaaooooaaaooabeeefa",
    "abageeaoqqccoooobqqcaabeeebb",
    "bbagbgaocccboooobqqccaagggbb",
    "bbagbgmoenneoooobeeeebggggbb",
    "llagbammbnbooooobnnneagggabb",
    ".aaagahmhmoooooooobboogggabb",
    "..acggmmmmooooooommmmaggalbb",
    "..gcagbamoooooooommmagggcall",
    ".agccaacaioooooooomagggaccla",
    "aggcacccaallaaiaaaaaagaccccc",
    "aagcagccaaaaalaalllagacccacc",
  ],
};

// Hand-drawn 14x14 chibi version (7 rows) using the same palette; the downscaled one loses the eyes.
export const DAFEIYU_MINI = {
  palette: DAFEIYU.palette,
  rows: [
    "....ppplppp...",
    "..pleeeeeeelp.",
    ".peeekkeeeeelp",
    "aeeeeeeeeeeeep",
    "aeeeaeeeeaeeef",
    "aeeaooooooaeea",
    "geaaaaooaaaaeg",
    "geaddnooddnaeg",
    "ggadkkookkdagg",
    "ggamoooooomagg",
    "cggaoooooooagc",
    ".cggaaooaaggc.",
    "..cggaffaggc..",
    "...ccc..ccc...",
  ],
};


// DeepSeek whale, 13x8 px (4 rows), hand-drawn after the logo.
export const WHALE = {
  palette: { "#": "#4d6bfe" },
  rows: [
    ".........#..#",
    "....####..##.",
    ".#########.#.",
    "#########.##.",
    "#..#########.",
    "#......####..",
    ".###..####...",
    "..#######....",
  ],
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(";");

/** Render pixel art as truecolor ANSI, two pixels per cell with "▀" (fg = top, bg = bottom). */
export function artToAnsi({ palette, rows }) {
  const out = [];
  for (let y = 0; y < rows.length; y += 2) {
    const top = rows[y];
    const bot = rows[y + 1] ?? ".".repeat(top.length);
    let line = "";
    for (let x = 0; x < top.length; x++) {
      const t = palette[top[x]];
      const b = palette[bot[x]];
      if (!t && !b) line += "\x1b[0m ";
      else if (!t) line += `\x1b[0m\x1b[38;2;${rgb(b)}m▄`;
      else if (!b) line += `\x1b[0m\x1b[38;2;${rgb(t)}m▀`;
      else line += `\x1b[38;2;${rgb(t)};48;2;${rgb(b)}m▀`;
    }
    out.push(line + "\x1b[0m");
  }
  return out.join("\n");
}
