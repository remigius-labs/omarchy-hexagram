# Daily Hexagram

One I Ching hexagram sits in your Omarchy bar. It changes once a day.

Your machine throws the coins:

```
od -An -tx1 -N32 /dev/urandom | tr -d ' \n'; echo
```

32 bytes, the size of a private key, cached per calendar day in
`~/.cache/daily-hexagram/seed`. The first six bytes are the six lines. The low
three bits of each byte are three coins, so the odds are the real three-coin
odds: old yin, young yang, young yin, old yang at 1/8, 3/8, 3/8, 1/8.

The bar shows the primary hexagram as its Unicode glyph (U+4DC0 to U+4DFF).
Click it for the name, the six lines with changing lines marked, the hexagram
it becomes, and the seed itself.

No network. No text beyond 64 names. If you want a full oracle with the
Wilhelm line texts, see layolayo/omarchy-iching-oracle. This is not that. This
is the date, but for the I Ching.

## Install

```
omarchy plugin add https://github.com/remigius-labs/omarchy-hexagram
```

MIT.
