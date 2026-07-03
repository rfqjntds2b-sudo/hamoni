const voiceProfile = {
  intro: {
    sectionLabel: 'ボイスプロフィール',
    title: '自分の声はどんなタイプ？',
    subtitle: '3回の短いテストで12種類のボイスタイプから自分を見つけましょう。約90秒。',
    typeGridLabel: '12種類のボイスタイプ',
    defaultMic: 'デフォルトマイク',
    micLabel: 'マイク {id}',
    startTest: 'テスト開始',
  },
  analyzing: {
    title: '分析中',
    subtitle: '声を分析しています',
  },
  result: {
    sectionLabel: 'ボイスプロフィール結果',
    retry: 'もう一度測定する',
    footerNote: 'ボイスプロフィールは現在の声の状態を反映しています。',
    footerNote2: 'コンディションにより結果が異なる場合があります。',
    celebrityMatch: '{names}に似た声',
    celebritySubtext: '似た音色特性を持つボーカリスト',
    basePitch: '基本音高 {hz}Hz',
    rangeOctaves: '音域 {octaves}オクターブ',
    stabilityScore: '安定性 {score}点',
  },
  test: {
    micError: 'マイクエラー',
    preparing: '準備中...',
    testPhase: 'テスト {current}/{total}',
    getReady: '準備してください',
    recording: '録音中',
    volumeAria: '音量',
    phaseComplete: '{name} 完了！',
    nextTest: '次のテスト',
    insufficientVoice: '十分な音声が検出されませんでした',
    insufficientVoiceDesc: 'マイクに近づいて、もう少し大きな声を出してください。',
    retry: 'もう一度',
    skip: 'スキップ',
  },
  share: {
    canvasHeader: 'HAMONI ボイスプロフィール',
    shareTitle: 'HAMONI ボイスプロフィール — {type}',
    shareText: '私のボイスタイプは「{type}」',
    shareTemperatureWarm: '温かい',
    shareTemperatureCool: 'クール',
    shareRangeHigh: '高音型',
    shareRangeLow: '低音型',
    shareRangeMid: '中音型',
    shareExpressionDynamic: 'ダイナミック',
    shareExpressionStable: '安定的',
    shareFormat: '私のボイスBTIは「{label}」！{temperature}音色の{range}、{expression}な表現スタイル 🎤',
    generating: '生成中...',
    share: '共有する',
    download: '画像を保存',
  },
  types: {
    clear_wind: {
      label: '澄んだ風',
      tagline: '透き通るように響く、清らかな風のような声',
      description:
        'あなたの声は早朝の山を吹き抜ける澄んだ風のようです。' +
        '無駄のないクリアな音色が特徴で、安定した心地よいトーンが聴く人の心を穏やかにします。' +
        '華やかさよりも真摯さで勝負するタイプです。',
      traits: '透明な音色,安定した呼吸,穏やかな伝達力',
      celebrities: 'IU,ユンナ',
    },
    clear_flame: {
      label: '澄んだ炎',
      tagline: '澄んだ音色から弾ける強烈なエネルギー',
      description:
        '水晶のように透明な音色なのに、その中に爆発的なエネルギーが潜んでいます。' +
        '静かに始まり、瞬間的に激しく爆発させる力があなたの武器です。' +
        '歌唱力で聴衆を圧倒するパフォーマー気質が強いタイプです。',
      traits: '爆発的な声量,鮮明な高音,ステージ型エネルギー',
      celebrities: 'Ailee,ソヒャン',
    },
    clear_wave: {
      label: '澄んだ波',
      tagline: 'きらめく波のように揺れる旋律',
      description:
        '透明な音色の上にやさしく揺れるビブラートが魅力的です。' +
        '感情の機微を繊細に表現する能力に優れ、バラードで特に輝くタイプです。' +
        '一音一音に物語を込められる、感性豊かなボーカリストです。',
      traits: '繊細なビブラート,感性的な表現,叙情的な音色',
      celebrities: 'テヨン,ベン',
    },
    warm_wind: {
      label: '温かい風',
      tagline: '心地よく包み込む春風のような声',
      description:
        'あなたの声は温かい春風のように聴く人を心地よく包みます。' +
        '豊かな中低音に安定した呼吸が加わり、長く聴いても疲れない声です。' +
        'ラジオDJやナレーションのように「ずっと聴いていたい声」のお手本です。',
      traits: '心地よい中低音,安らぎの安定感,自然な呼吸',
      celebrities: 'ソン・シギョン,イ・ジョク',
    },
    warm_flame: {
      label: '温かい炎',
      tagline: '深い温もりの中で燃え上がる情熱の炎',
      description:
        '温かい音色の中に強烈なエネルギーを秘めたあなたは、感情を爆発させた時に本当に輝きます。' +
        '中低音の深さと高音のパワーを兼ね備え、一曲の中でドラマチックな物語を作り出します。' +
        '歌で語る生まれながらのストーリーテラーです。',
      traits: 'ドラマチックな表現,パワフルな感性,広いダイナミクス',
      celebrities: 'パク・ヒョシン,キム・ボムス',
    },
    warm_wave: {
      label: '温かい波',
      tagline: '深い湖に静かに広がる波のような響き',
      description:
        '心地よい音色の上に静かに流れるビブラートが特別な深みを生み出します。' +
        '感情を抑えながらも豊かに伝える力が卓越で、ワンフレーズで人を泣かせることができます。' +
        '歳月を重ねるほど深まる声の持ち主です。',
      traits: '豊かな響き,節度ある感性,深い余韻',
      celebrities: 'イ・ソラ,コミ',
    },
    deep_wind: {
      label: '深い風',
      tagline: '大地を静かに撫でる深い風',
      description:
        '重厚な低音が空間を満たすあなたの声は、一言にも重みが宿ります。' +
        '控えめで節制された発声がかえって信頼感とカリスマを生み出します。' +
        '「声だけで雰囲気を変える人」とよく言われるタイプです。',
      traits: '重厚な低音,節制されたカリスマ,信頼感あるトーン',
      celebrities: 'ナウル,イ・スンギ',
    },
    deep_flame: {
      label: '深い炎',
      tagline: '深みから溶岩のように噴き出す力',
      description:
        '底から湧き上がる重厚なエネルギーがあなたの声の核心です。' +
        '普段は深く落ち着いていますが、感情が入ると火山のように爆発的に変わるギャップの持ち主です。' +
        'ロックバラードやパワフルな曲で真価が発揮されるタイプです。',
      traits: '低音のパワー,爆発的なギャップ,強烈な存在感',
      celebrities: 'キム・ジョングク,イム・チャンジョン',
    },
    deep_wave: {
      label: '深い波',
      tagline: '深海からゆっくり押し寄せる巨大な波',
      description:
        '広く深い音域でしなやかに動くあなたの声は、深海の海流のようです。' +
        '豊かな低音と滑らかな動きが調和し、壮大でありながら叙情的な雰囲気を作り出します。' +
        '時の重みを宿したクラシカルな魅力のボーカリストです。',
      traits: '壮大なスケール,しなやかな動き,クラシカルな深み',
      celebrities: 'イ・ムンセ,チョー・ヨンピル',
    },
    husky_wind: {
      label: 'ハスキーウィンド',
      tagline: '乾いた砂漠を吹き抜ける魅力的な息遣い',
      description:
        '少しかすれた質感がかえって唯一無二の魅力になる声です。' +
        '控えめな表現の中に込められた風のような息遣いが、聴く人に不思議な感性を伝えます。' +
        '力を抜くほど魅力的に聞こえる、R&Bとアコースティックに似合う感性ボーカルです。',
      traits: '唯一無二の音色,風のような息遣い,ムーディーな感性',
      celebrities: 'クラッシュ,ディーン',
    },
    husky_flame: {
      label: 'ハスキーフレイム',
      tagline: '荒い砂嵐の中で燃え上がる強烈な炎',
      description:
        '荒々しくありのままの魅力を持つあなたの声は、一度聴いたら忘れられません。' +
        'ハスキーな質感の上に強烈なエネルギーを乗せるスタイルで、特にライブで爆発的な存在感を発揮します。' +
        'ジャンルを超えて自分だけの色をしっかり持つタイプです。',
      traits: '生のエネルギー,強烈な個性,ライブ型爆発力',
      celebrities: 'Zion.T,パク・ジェボム',
    },
    husky_wave: {
      label: 'ハスキーウェーブ',
      tagline: '霧の海の上をやさしく流れる波',
      description:
        '夢幻的なハスキートーンにやさしい動きが加わったあなたの声は、まるで霧の海のようです。' +
        '感情の機微を繊細に揺さぶる力があり、聴く人を自然にあなたの世界へ引き込みます。' +
        '代替不可能な雰囲気を持つアーティストタイプです。',
      traits: '夢幻的な雰囲気,繊細な感情線,独自の世界観',
      celebrities: 'ヘイズ,ペク・イェリン',
    },
  },
  toneLabels: {
    clear: '澄んだ',
    warm: '温かい',
    deep: '深い',
    husky: 'ハスキー',
  },
  expressionLabels: {
    wind: '風',
    flame: '炎',
    wave: '波',
  },
  spectrumLabels: {
    temperature: { left: 'クール', right: '温かい', label: '音色温度' },
    range: { left: '低音型', right: '高音型', label: '音域帯' },
    expression: { left: '安定的', right: 'ダイナミック', label: '表現スタイル' },
  },
  testPhases: {
    sustained: {
      name: '楽な声出し',
      instruction: '楽な音程で「アー」を長く伸ばしてください。2回繰り返します。',
      measuresLabel: '音色と安定性を測定します',
    },
    rangeSweep: {
      name: '音域探索',
      instruction: '最も低い音から高い音までゆっくり上がり、また下りてきてください。',
      measuresLabel: '音域と柔軟性を測定します',
    },
    expression: {
      name: '表現チャレンジ',
      instruction: '楽な音から始めて徐々に大きく、再び徐々に小さく発声してください。自由に表現してみてください！',
      measuresLabel: 'ダイナミクスと表現力を測定します',
    },
  },
  description: {
    temperatureCool: 'ひんやりと透明な質感があなたの声の第一印象です。',
    temperatureNeutral: 'クールと温かさの絶妙なバランスがあなたの声の魅力です。',
    temperatureSlightlyWarm: 'ほのかな温もりが漂う音色が心地よい雰囲気を作ります。',
    temperatureWarm: '聴く人を温かく包み込む温度が感じられます。',
    rangeLow: '低音域が特に豊かなタイプです。{octaveText}',
    rangeMid: '中音域が安定したバランスの良いタイプです。{octaveText}',
    rangeHigh: '高音域で輝くタイプです。{octaveText}',
    octavesWide: '約{octaves}オクターブの広い音域を持っています。',
    octavesMedium: '約{octaves}オクターブの音域を活用しています。',
    octavesNarrow: '現在約{octaves}オクターブの範囲で安定的に発声しています。',
    expressionStable: '一定に保たれる安定した発声が大きな長所です。心地よく長く聴ける声です。',
    expressionBalanced: '安定感の中に適切な変化を付けられる、バランスの取れた表現力があります。',
    expressionFree: '多様な感情表現が自由にできます。歌に自分だけの色を加える能力が目立ちます。',
    expressionDynamic: '自由でダイナミックな表現力があなたの最大の武器です。ステージで輝くタイプです。',
    strengthAllRound: 'あらゆる面でバランスの取れた声を持っています — 様々なジャンルに合うオールラウンダータイプ！',
    strengthTempWarm: '特に温かい感性が強みです — バラードやアコースティックで真価を発揮するでしょう。',
    strengthTempCool: '特に鮮明でクリアな音色が強みです — ポップやダンス曲で存在感が光るでしょう。',
    strengthRangeHigh: '高音域の自由さが強みです — 伸びやかな高音が魅力的でしょう。',
    strengthRangeLow: '低音域の深さが強みです — 深く豊かな低音が聴く人を魅了するでしょう。',
    strengthExprDynamic: 'ダイナミックな表現力が強みです — ライブやステージでさらに輝くパフォーマータイプ！',
    strengthExprStable: '安定した発声が強みです — レコーディングやナレーションでも素晴らしい結果を出せます。',
  },
  signature: {
    ariaLabel: '{type} ボイスシグネチャー',
  },
} as const;

export default voiceProfile;
