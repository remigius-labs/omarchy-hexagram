// Daily Hexagram — cast math. Pure functions, no Qt.
//
// Seed: 32 bytes from /dev/urandom as 64 hex chars, cached per calendar day.
// Cast: the first six bytes are the six lines, bottom to top. The low three
// bits of each byte are three coins (heads = 1). Coin sum 6..9:
//   6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing).
// That gives the real three-coin odds (1/8, 3/8, 3/8, 1/8), not a flat d4.

// Shell one-liner: print "<YYYY-MM-DD> <64 hex>" for today, rolling a new seed
// only when the cached date is stale. The visible ritual is the od line.
var castScript =
  'cache="${XDG_CACHE_HOME:-$HOME/.cache}/daily-hexagram/seed"; ' +
  'today=$(date +%F); ' +
  'if [ -f "$cache" ]; then read -r d s < "$cache"; ' +
  '  if [ "$d" = "$today" ] && [ ${#s} -eq 64 ]; then echo "$d $s"; exit 0; fi; fi; ' +
  'mkdir -p "$(dirname "$cache")"; ' +
  "s=$(od -An -tx1 -N32 /dev/urandom | tr -d ' \\n'); " +
  'echo "$today $s" | tee "$cache"'

// Trigrams as three bits, bottom line first. Q Qian ☰ K Kun ☷ Z Zhen ☳
// N Kan ☵ G Gen ☶ X Xun ☴ L Li ☲ D Dui ☱
var trigramBits = { Q: "111", K: "000", Z: "100", N: "010", G: "001", X: "011", L: "101", D: "110" }
var trigramGlyph = { Q: "☰", K: "☷", Z: "☳", N: "☵", G: "☶", X: "☴", L: "☲", D: "☱" }

// King Wen sequence 1..64 as lower+upper trigram.
var kingWen = (
  "QQ KK ZN NG QN NQ NK KN QX DQ QK KQ LQ QL GK KZ ZD XG DK KX " +
  "ZL LG KG ZK ZQ QG ZG XD NN LL GD XZ GQ QZ KL LK LX DL GN NZ " +
  "DG ZX QD XQ KD XK ND XN LD XL ZZ GG GX DZ LZ GL XX DD NX DN " +
  "DX GZ LN NL").split(" ")

var names = [
  "The Creative", "The Receptive", "Difficulty at the Beginning", "Youthful Folly",
  "Waiting", "Conflict", "The Army", "Holding Together",
  "The Taming Power of the Small", "Treading", "Peace", "Standstill",
  "Fellowship", "Possession in Great Measure", "Modesty", "Enthusiasm",
  "Following", "Work on What Has Been Spoiled", "Approach", "Contemplation",
  "Biting Through", "Grace", "Splitting Apart", "Return",
  "Innocence", "The Taming Power of the Great", "The Corners of the Mouth", "Preponderance of the Great",
  "The Abysmal", "The Clinging", "Influence", "Duration",
  "Retreat", "The Power of the Great", "Progress", "Darkening of the Light",
  "The Family", "Opposition", "Obstruction", "Deliverance",
  "Decrease", "Increase", "Break-through", "Coming to Meet",
  "Gathering Together", "Pushing Upward", "Oppression", "The Well",
  "Revolution", "The Cauldron", "The Arousing", "Keeping Still",
  "Development", "The Marrying Maiden", "Abundance", "The Wanderer",
  "The Gentle", "The Joyous", "Dispersion", "Limitation",
  "Inner Truth", "Preponderance of the Small", "After Completion", "Before Completion"
]

var pinyin = [
  "Qián", "Kūn", "Zhūn", "Méng", "Xū", "Sòng", "Shī", "Bǐ",
  "Xiǎo Chù", "Lǚ", "Tài", "Pǐ", "Tóng Rén", "Dà Yǒu", "Qiān", "Yù",
  "Suí", "Gǔ", "Lín", "Guān", "Shì Kè", "Bì", "Bō", "Fù",
  "Wú Wàng", "Dà Chù", "Yí", "Dà Guò", "Kǎn", "Lí", "Xián", "Héng",
  "Dùn", "Dà Zhuàng", "Jìn", "Míng Yí", "Jiā Rén", "Kuí", "Jiǎn", "Xiè",
  "Sǔn", "Yì", "Guài", "Gòu", "Cuì", "Shēng", "Kùn", "Jǐng",
  "Gé", "Dǐng", "Zhèn", "Gèn", "Jiàn", "Guī Mèi", "Fēng", "Lǚ",
  "Xùn", "Duì", "Huàn", "Jié", "Zhōng Fú", "Xiǎo Guò", "Jì Jì", "Wèi Jì"
]

// bits: six-char string, bottom line first, "1" yang. Returns King Wen 1..64.
var bitsToNumber = {}
for (var i = 0; i < kingWen.length; i++)
  bitsToNumber[trigramBits[kingWen[i][0]] + trigramBits[kingWen[i][1]]] = i + 1

function popcount3(b) {
  return (b & 1) + ((b >> 1) & 1) + ((b >> 2) & 1)
}

// Six line values 6..9, bottom to top, from the first six bytes of the seed.
function linesFromSeed(hex) {
  var lines = []
  for (var i = 0; i < 6; i++)
    lines.push(6 + popcount3(parseInt(hex.substr(i * 2, 2), 16)))
  return lines
}

function bitsOf(lines, transformed) {
  var s = ""
  for (var i = 0; i < 6; i++) {
    var yang = lines[i] === 7 || lines[i] === 9
    if (transformed && (lines[i] === 6 || lines[i] === 9)) yang = !yang
    s += yang ? "1" : "0"
  }
  return s
}

function describe(n) {
  var kw = kingWen[n - 1]
  return {
    number: n,
    glyph: String.fromCharCode(0x4DC0 + n - 1),
    name: names[n - 1],
    pinyin: pinyin[n - 1],
    lower: trigramGlyph[kw[0]],
    upper: trigramGlyph[kw[1]]
  }
}

// raw: "<date> <64 hex>" from castScript. Returns null if malformed.
function cast(raw) {
  var parts = String(raw || "").trim().split(/\s+/)
  if (parts.length < 2 || !/^[0-9a-f]{64}$/.test(parts[1])) return null
  var seed = parts[1]
  var lines = linesFromSeed(seed)
  var primary = describe(bitsToNumber[bitsOf(lines, false)])
  var changing = []
  for (var i = 0; i < 6; i++) if (lines[i] === 6 || lines[i] === 9) changing.push(i + 1)
  var future = changing.length ? describe(bitsToNumber[bitsOf(lines, true)]) : null
  return { date: parts[0], seed: seed, lines: lines, primary: primary, changing: changing, future: future }
}

if (typeof module !== "undefined") module.exports = { cast: cast, kingWen: kingWen, bitsToNumber: bitsToNumber, names: names, pinyin: pinyin }
