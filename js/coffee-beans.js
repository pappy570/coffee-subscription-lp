/**
 * コーヒー豆データベース（BeanSKU）
 * 後からDB/CSV化できるように、配列定数として管理
 */
var COFFEE_BEANS_DB = [
  {
    skuId: "SKU-001",
    roasterName: "丸山珈琲",
    beanName: "エチオピア イルガチェフェ G1",
    aroma: 5, sweetness: 4, acidity: 4, bitterness: 1, body: 2,
    roastLevel: "light",
    process: "washed",
    stockGrams: 500,
    roastDate: "2026-02-05",
    tags: ["フルーティ", "華やか"]
  },
  {
    skuId: "SKU-002",
    roasterName: "堀口珈琲",
    beanName: "グアテマラ アンティグア",
    aroma: 3, sweetness: 3, acidity: 3, bitterness: 3, body: 3,
    roastLevel: "medium",
    process: "washed",
    stockGrams: 400,
    roastDate: "2026-02-08",
    tags: ["バランス", "定番"]
  },
  {
    skuId: "SKU-003",
    roasterName: "LIGHT UP COFFEE",
    beanName: "ケニア ニエリ AA",
    aroma: 4, sweetness: 2, acidity: 5, bitterness: 2, body: 2,
    roastLevel: "light",
    process: "washed",
    stockGrams: 300,
    roastDate: "2026-02-01",
    tags: ["明るい酸味", "シトラス"]
  },
  {
    skuId: "SKU-004",
    roasterName: "猿田彦珈琲",
    beanName: "インドネシア マンデリン",
    aroma: 3, sweetness: 2, acidity: 1, bitterness: 5, body: 5,
    roastLevel: "dark",
    process: "natural",
    stockGrams: 350,
    roastDate: "2026-02-10",
    tags: ["重厚", "スパイシー"]
  },
  {
    skuId: "SKU-005",
    roasterName: "ONIBUS COFFEE",
    beanName: "コロンビア ウイラ",
    aroma: 4, sweetness: 5, acidity: 2, bitterness: 1, body: 3,
    roastLevel: "medium",
    process: "honey",
    stockGrams: 450,
    roastDate: "2026-02-12",
    tags: ["甘い", "なめらか"]
  },
  {
    skuId: "SKU-006",
    roasterName: "FUGLEN COFFEE",
    beanName: "コスタリカ ターラス",
    aroma: 4, sweetness: 3, acidity: 4, bitterness: 2, body: 2,
    roastLevel: "light",
    process: "honey",
    stockGrams: 200,
    roastDate: "2026-01-28",
    tags: ["クリーン", "フローラル"]
  },
  {
    skuId: "SKU-007",
    roasterName: "VERVE COFFEE",
    beanName: "ブラジル セラード",
    aroma: 2, sweetness: 3, acidity: 1, bitterness: 4, body: 4,
    roastLevel: "dark",
    process: "natural",
    stockGrams: 600,
    roastDate: "2026-02-14",
    tags: ["ナッツ", "チョコレート"]
  },
  {
    skuId: "SKU-008",
    roasterName: "GLITCH COFFEE",
    beanName: "パナマ ゲイシャ",
    aroma: 5, sweetness: 5, acidity: 3, bitterness: 1, body: 3,
    roastLevel: "light",
    process: "washed",
    stockGrams: 200,
    roastDate: "2026-02-06",
    tags: ["エレガント", "ジャスミン"]
  },
  {
    skuId: "SKU-009",
    roasterName: "UNLIMITED COFFEE",
    beanName: "ルワンダ キブンゴ",
    aroma: 4, sweetness: 4, acidity: 3, bitterness: 2, body: 3,
    roastLevel: "medium",
    process: "washed",
    stockGrams: 300,
    roastDate: "2026-01-25",
    tags: ["ベリー", "やわらか"]
  },
  {
    skuId: "SKU-010",
    roasterName: "PASSAGE COFFEE",
    beanName: "エルサルバドル パカマラ",
    aroma: 3, sweetness: 4, acidity: 2, bitterness: 3, body: 4,
    roastLevel: "medium",
    process: "honey",
    stockGrams: 350,
    roastDate: "2026-02-03",
    tags: ["まろやか", "キャラメル"]
  },
  {
    skuId: "SKU-011",
    roasterName: "THE ROASTERS",
    beanName: "ペルー チャンチャマイヨ",
    aroma: 3, sweetness: 2, acidity: 2, bitterness: 2, body: 2,
    roastLevel: "medium",
    process: "washed",
    stockGrams: 100,
    roastDate: "2026-01-10",
    tags: ["マイルド"]
  },
  {
    skuId: "SKU-012",
    roasterName: "KOFFEE MAMEYA",
    beanName: "エチオピア シダモ ナチュラル",
    aroma: 5, sweetness: 4, acidity: 2, bitterness: 1, body: 4,
    roastLevel: "medium",
    process: "natural",
    stockGrams: 250,
    roastDate: "2026-02-11",
    tags: ["ワイニー", "ベリー"]
  }
];
