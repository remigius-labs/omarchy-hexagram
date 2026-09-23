// Daily Hexagram — cast math. Pure functions, no Qt.
//
// Seed: 32 bytes from /dev/urandom as 64 hex chars, cached per calendar day.
// Cast: the first six bytes are the six lines, bottom to top. The low three
// bits of each byte are three coins (heads = 1); an odd number of heads is a
// yang line, even is yin. One seed, one hexagram. No changing lines: the day
// gives you one answer.

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

// Original short explainers, one per hexagram. Plain paraphrases written for
// this plugin (MIT), not lifted from Wilhelm (still under copyright) or Legge.
var meanings = [
  "Pure drive. Start what you have been putting off and keep going once started. Strength holds when it is steady.",
  "Yield and carry. Let others lead today and follow the path that is already there. Support is the strong move.",
  "A sprout pushing through hard ground. Early chaos is normal. Do not force it; find helpers and get the first order in place.",
  "You do not know yet, and that is fine. Ask once and listen properly. Asking the same thing three times gets no answer.",
  "The rain is coming and you cannot hurry it. Eat, rest, stay ready. Confidence while waiting is the whole task.",
  "You are right and still blocked. Stop halfway rather than push to the end. Bring in a wiser third party; do not launch anything big.",
  "Discipline and one clear leader. Organise the people and resources you have. Good order wins without blame.",
  "Alliance. Join, or be joined, while it is still open. Those who arrive late find the door closed.",
  "Dense clouds, no rain yet. Small restraint, small adjustments. Big moves are not available today; polish the details.",
  "You are stepping on the tiger's tail. Move carefully and politely and it will not bite. Conduct is everything.",
  "Heaven and earth meet. Things flow; the small goes and the great comes. Use good times to build, not to coast.",
  "The channels are shut. Do not spend effort on people who are not listening. Withdraw, keep your worth, wait it out.",
  "Community in the open. Work with people, in daylight, on shared aims. Cliques fail; the open group crosses the water.",
  "You have plenty. Hold it modestly and share it. Wealth and clarity together bring supreme success.",
  "The mountain under the earth. Lower yourself and things balance out. The modest person finishes what they start.",
  "Thunder out of the earth. Energy that moves people. Set things in motion, appoint helpers, march.",
  "Adapt to the moment. Follow what is right and others will follow you. No blame in going with the flow when the flow is good.",
  "Something rotted while nobody looked. Repair it. Three days of thought before, three days of care after.",
  "Something good comes near. Advance and meet it. Act now; the window closes in the eighth month.",
  "The view from the tower. Look before you act, and let others see you looking. Being seen with sincerity is itself an influence.",
  "An obstacle in the way. Bite through it cleanly and decisively. A clear penalty, quickly given, restores order.",
  "Form and beauty. Fine for small matters. Do not let decoration decide the big questions.",
  "The structure is crumbling; the bed is being stripped leg by leg. Not the time to go anywhere. Hold still and let it fall.",
  "The turning point. After the dark, movement returns on its own. Do not rush it; come and go freely, friends arrive.",
  "Act without calculation. Do what is right because it is right. Scheming now brings misfortune.",
  "Great strength held in reserve. Do not eat at home; go out, act, cross the water. Stored energy is meant to be used.",
  "Nourishment. Watch what you feed yourself and others, in food and in words. Be careful with both.",
  "The ridgepole is bending. Too much weight on the frame. Find a way through; do not add to the load.",
  "Water in the gorge, danger repeated. Stay sincere and keep moving the way water does. Do not freeze.",
  "Fire, light, clarity. Cling to what is right and take care of what sustains you. Perseverance furthers.",
  "Attraction. Let yourself be moved, and move others gently. Taking a partner brings good fortune.",
  "Keep going. Nothing new, just the same right thing again. Constancy is the point.",
  "Pull back in good order. Retreat at the right time is strength, not defeat. Small matters can still be handled.",
  "Thunder in heaven. You have the force; the question is whether you use it rightly. Do not butt the hedge.",
  "The sun rising over the earth. Advance easily; you are received three times in a day. Brightness that spreads.",
  "The light has gone under the earth. Hide your brightness and keep your inner clarity. Survive the dark.",
  "Home. Roles, warmth, order inside the house. Get the inner circle right and the rest follows.",
  "Fire above, lake below, pulling apart. Small things still work. Do not expect union today; accept the difference.",
  "Water on the mountain. The direct way is blocked. Go around, turn back, find the person who can help.",
  "The knot loosens. Thunder and rain clear the air. If there is nowhere to go, return; if there is, go quickly.",
  "Less. Give something up sincerely and it is not a loss. Two small bowls are enough for the offering.",
  "More. It furthers you to undertake something and cross the great water. Use the gain to help.",
  "Resolve it in the open. Name the thing truthfully, aware of the danger. Do not take up arms.",
  "Something small and tempting approaches. Do not marry it. Recognise what is growing before it grows.",
  "The lake over the earth. People gather around a centre. Bring a large offering; do it properly.",
  "Wood grows up through the earth. Steady effort, step by step. Go and see the great person; do not fear.",
  "Exhausted, dried out, and your words are not believed. Stay true anyway. Do not argue; act.",
  "The town moves, the well stays. Draw from the source you always had. Do not let the rope break short.",
  "Change of the skin. On the right day, people believe it. Make the change and it removes regret.",
  "The vessel that transforms. Nourish what is worth nourishing. Supreme good fortune, success.",
  "Shock. Thunder, then laughter. The scare passes and you are still holding the spoon. Do not drop it.",
  "The mountain. Stop when it is time to stop. Go into the courtyard and see no one. No blame.",
  "The wild goose approaches the shore, slowly. Gradual progress, like a marriage, not a raid. Take the steps in order.",
  "You entered on someone else's terms. Undertakings now bring misfortune. Understand the position and wait.",
  "Full noon. Be like the sun at its height, and do not be sad that it will move. Enjoy the peak while it is here.",
  "Traveller in a strange land. Small success if you stay polite and light. You own nothing here; do not act as if you do.",
  "Wind. Small, penetrating, repeated. Go somewhere, see the great person. The gentle way gets through.",
  "The lake. Ease and openness with others. Success through perseverance, not through flattery.",
  "Wind over water; the ice breaks. Dissolve what is rigid, in yourself or the group. Cross the great water.",
  "The lake with banks. Limits make the water useful. Galling limits, though, should not be pushed.",
  "Even pigs and fishes are moved by sincerity. Trust from the inside out. Cross the water; it furthers.",
  "The bird should not fly high. Small things succeed, great things do not. Stay low and be careful.",
  "It is done. Success in small matters, but the end brings disorder. Keep watch after the finish.",
  "Almost. The little fox nearly crosses and gets its tail wet. Do not rush the last step."
]

// bits: six-char string, bottom line first, "1" yang. Returns King Wen 1..64.
var bitsToNumber = {}
for (var i = 0; i < kingWen.length; i++)
  bitsToNumber[trigramBits[kingWen[i][0]] + trigramBits[kingWen[i][1]]] = i + 1

function popcount3(b) {
  return (b & 1) + ((b >> 1) & 1) + ((b >> 2) & 1)
}

// Six lines, bottom to top, true = yang. Odd heads out of three coins = yang.
function linesFromSeed(hex) {
  var lines = []
  for (var i = 0; i < 6; i++)
    lines.push(popcount3(parseInt(hex.substr(i * 2, 2), 16)) % 2 === 1)
  return lines
}

function bitsOf(lines) {
  var s = ""
  for (var i = 0; i < 6; i++) s += lines[i] ? "1" : "0"
  return s
}

function describe(n) {
  return {
    number: n,
    glyph: String.fromCharCode(0x4DC0 + n - 1),
    name: names[n - 1],
    pinyin: pinyin[n - 1],
    meaning: meanings[n - 1]
  }
}

// raw: "<date> <64 hex>" from castScript. Returns null if malformed.
function cast(raw) {
  var parts = String(raw || "").trim().split(/\s+/)
  if (parts.length < 2 || !/^[0-9a-f]{64}$/.test(parts[1])) return null
  var seed = parts[1]
  var lines = linesFromSeed(seed)
  var hexagram = describe(bitsToNumber[bitsOf(lines)])
  return { date: parts[0], seed: seed, lines: lines, hexagram: hexagram }
}

if (typeof module !== "undefined") module.exports = { cast: cast, kingWen: kingWen, bitsToNumber: bitsToNumber, names: names, pinyin: pinyin, meanings: meanings }
