const voiceProfile = {
  intro: {
    sectionLabel: 'Voice Profile',
    title: 'What type is my voice?',
    subtitle: 'Find your voice type among 12 types with 3 short tests. About 90 seconds.',
    typeGridLabel: '12 Voice Types',
    defaultMic: 'Default Mic',
    micLabel: 'Mic {id}',
    startTest: 'Start Test',
  },
  analyzing: {
    title: 'Analyzing',
    subtitle: 'Analyzing your voice',
  },
  result: {
    sectionLabel: 'Voice Profile Result',
    retry: 'Retake Test',
    footerNote: 'Your voice profile reflects your current vocal condition.',
    footerNote2: 'Results may vary depending on your condition.',
    celebrityMatch: 'Similar voice to {names}',
    celebritySubtext: 'Vocalists with similar tonal characteristics',
    basePitch: 'Base pitch {hz}Hz',
    rangeOctaves: 'Range {octaves} octaves',
    stabilityScore: 'Stability {score}',
  },
  test: {
    micError: 'Microphone Error',
    preparing: 'Preparing...',
    testPhase: 'Test {current}/{total}',
    getReady: 'Get ready',
    recording: 'Recording',
    volumeAria: 'Volume',
    phaseComplete: '{name} Complete!',
    nextTest: 'Next Test',
    insufficientVoice: 'Not enough sound detected',
    insufficientVoiceDesc: 'Please speak louder, closer to the microphone.',
    retry: 'Retry',
    skip: 'Skip',
  },
  share: {
    canvasHeader: 'HAMONI Voice Profile',
    shareTitle: 'HAMONI Voice Profile — {type}',
    shareText: 'My voice type is "{type}"',
    shareTemperatureWarm: 'warm',
    shareTemperatureCool: 'cool',
    shareRangeHigh: 'high-range',
    shareRangeLow: 'low-range',
    shareRangeMid: 'mid-range',
    shareExpressionDynamic: 'dynamic',
    shareExpressionStable: 'stable',
    shareFormat: 'My Voice BTI is "{label}"! A {temperature} tone, {range}, {expression} expression style 🎤',
    generating: 'Generating...',
    share: 'Share',
    download: 'Save Image',
  },
  types: {
    clear_wind: {
      label: 'Clear Wind',
      tagline: 'A clear, pristine voice like a transparent breeze',
      description:
        'Your voice is like a clean breeze blowing over a mountain at dawn. ' +
        'Its defining quality is a crisp, uncluttered tone that delivers with clarity. ' +
        'A stable, comfortable sound that soothes the listener — you win with authenticity over flash.',
      traits: 'Transparent tone,Stable breath,Calm delivery',
      celebrities: 'IU,Younha',
    },
    clear_flame: {
      label: 'Clear Flame',
      tagline: 'Intense energy bursting from a clear tone',
      description:
        'Your voice has crystal-clear transparency, but underneath lies explosive energy. ' +
        'Starting quietly, then detonating with sudden intensity — that power is your weapon. ' +
        'A strong performer type who overwhelms the audience with sheer vocal ability.',
      traits: 'Explosive power,Bright highs,Stage energy',
      celebrities: 'Ailee,Sohyang',
    },
    clear_wave: {
      label: 'Clear Wave',
      tagline: 'A shimmering melody like glistening ripples',
      description:
        'A gentle vibrato floating over a transparent tone makes your voice captivating. ' +
        'Your gift for expressing the subtleties of emotion shines especially in ballads. ' +
        'An emotional vocalist who knows how to weave a story into every note.',
      traits: 'Delicate vibrato,Emotional expression,Lyrical tone',
      celebrities: 'Taeyeon,Ben',
    },
    warm_wind: {
      label: 'Warm Wind',
      tagline: 'A cozy spring breeze that wraps you in warmth',
      description:
        'Your voice embraces the listener like a warm spring breeze. ' +
        'Rich mid-low tones with steady breath support make it a voice people never tire of hearing. ' +
        'The textbook example of "a voice you could listen to forever" — like a radio host or narrator.',
      traits: 'Cozy mid-lows,Comfortable stability,Natural breath',
      celebrities: 'Sung Si-kyung,Lee Juck',
    },
    warm_flame: {
      label: 'Warm Flame',
      tagline: 'A passionate flame burning within deep warmth',
      description:
        'With intense energy hidden inside a warm tone, you truly shine when emotions erupt. ' +
        'Combining the depth of mid-low tones with high-note power, you create dramatic stories within a single song. ' +
        'A natural-born storyteller who sings.',
      traits: 'Dramatic expression,Powerful emotion,Wide dynamics',
      celebrities: 'Park Hyoshin,Kim Bumsoo',
    },
    warm_wave: {
      label: 'Warm Wave',
      tagline: 'Gentle ripples spreading across a deep lake',
      description:
        'A gentle vibrato flowing over a cozy tone creates a special depth. ' +
        'Your remarkable ability to convey emotion with restraint yet richness can move people in a single phrase. ' +
        'The owner of a voice that only deepens with time.',
      traits: 'Rich resonance,Restrained emotion,Deep afterglow',
      celebrities: 'Lee Sora,Gummy',
    },
    deep_wind: {
      label: 'Deep Wind',
      tagline: 'A deep wind quietly sweeping across the earth',
      description:
        'Your weighty low tones fill any space, and every word carries gravity. ' +
        'Restrained, controlled delivery creates an aura of trust and charisma. ' +
        'The type often told "you change the mood just with your voice."',
      traits: 'Weighty bass,Restrained charisma,Trustworthy tone',
      celebrities: 'Naul,Lee Seunggi',
    },
    deep_flame: {
      label: 'Deep Flame',
      tagline: 'Power erupting like lava from the depths',
      description:
        'Heavy energy rising from the very bottom is the essence of your voice. ' +
        'Usually deep and calm, but when emotion kicks in, you transform explosively like a volcano. ' +
        'A type whose true worth shines in rock ballads and powerful songs.',
      traits: 'Low-end power,Explosive contrast,Intense presence',
      celebrities: 'Kim Jongkook,Im Changjung',
    },
    deep_wave: {
      label: 'Deep Wave',
      tagline: 'A massive tide rolling in slowly from the deep ocean',
      description:
        'Moving fluidly across a wide, deep range, your voice is like a deep ocean current. ' +
        'Rich low tones and smooth movement combine to create a sound that is both grand and lyrical. ' +
        'A vocalist with a classic charm that carries the weight of time.',
      traits: 'Grand scale,Fluid movement,Classic depth',
      celebrities: 'Lee Moonsae,Cho Yongpil',
    },
    husky_wind: {
      label: 'Husky Wind',
      tagline: 'An alluring breath like wind across a dry desert',
      description:
        'A slightly rough texture becomes a uniquely attractive quality in your voice. ' +
        'Breathy undertones within restrained expression convey a mysterious emotion to the listener. ' +
        'The less you push, the more attractive you sound — a soulful vocalist suited for R&B and acoustic.',
      traits: 'Unique timbre,Breathy quality,Moody emotion',
      celebrities: 'Crush,Dean',
    },
    husky_flame: {
      label: 'Husky Flame',
      tagline: 'An intense flame burning in a rough sandstorm',
      description:
        'Your raw, unrefined vocal character is impossible to forget once heard. ' +
        'Delivering fierce energy over a husky texture, you unleash explosive presence especially in live settings. ' +
        'A type who clearly owns a distinct identity across genres.',
      traits: 'Raw energy,Fierce individuality,Live explosive power',
      celebrities: 'Zion.T,Jay Park',
    },
    husky_wave: {
      label: 'Husky Wave',
      tagline: 'Gentle ripples flowing over a foggy sea',
      description:
        'Your voice, with its dreamy husky tone and soft movement, is like a foggy sea. ' +
        'With the ability to subtly stir the threads of emotion, you naturally draw listeners into your world. ' +
        'An artist type with an irreplaceable atmosphere.',
      traits: 'Dreamy atmosphere,Delicate emotion,Unique world',
      celebrities: 'Heize,Yerin Baek',
    },
  },
  toneLabels: {
    clear: 'Clear',
    warm: 'Warm',
    deep: 'Deep',
    husky: 'Husky',
  },
  expressionLabels: {
    wind: 'Wind',
    flame: 'Flame',
    wave: 'Wave',
  },
  spectrumLabels: {
    temperature: { left: 'Cool', right: 'Warm', label: 'Tone Temperature' },
    range: { left: 'Low', right: 'High', label: 'Range Zone' },
    expression: { left: 'Stable', right: 'Dynamic', label: 'Expression Style' },
  },
  testPhases: {
    sustained: {
      name: 'Comfortable Tone',
      instruction: 'Hold a long "Ah~" at a comfortable pitch. Repeat twice.',
      measuresLabel: 'Measures tone and stability',
    },
    rangeSweep: {
      name: 'Range Sweep',
      instruction: 'Slowly glide from your lowest note to your highest, then back down.',
      measuresLabel: 'Measures range and flexibility',
    },
    expression: {
      name: 'Expression Challenge',
      instruction: 'Start at a comfortable note, gradually get louder, then softer. Express yourself freely!',
      measuresLabel: 'Measures dynamics and expressiveness',
    },
  },
  description: {
    temperatureCool: 'A cool, transparent texture is your voice\'s first impression.',
    temperatureNeutral: 'A subtle balance between cool and warm is what makes your voice charming.',
    temperatureSlightlyWarm: 'A gentle warmth in your tone creates a comfortable atmosphere.',
    temperatureWarm: 'You can feel a cozy warmth that embraces the listener.',
    rangeLow: 'Your low range is especially rich. {octaveText}',
    rangeMid: 'A well-balanced type with a stable mid-range. {octaveText}',
    rangeHigh: 'A type that shines in the high range. {octaveText}',
    octavesWide: 'You have a wide range of about {octaves} octaves.',
    octavesMedium: 'You\'re using a range of about {octaves} octaves.',
    octavesNarrow: 'You\'re currently voicing stably within about {octaves} octaves.',
    expressionStable: 'Consistently stable delivery is a big strength. A voice people can listen to comfortably for a long time.',
    expressionBalanced: 'You have a balanced expressiveness — knowing when to stay stable and when to add variation.',
    expressionFree: 'You\'re quite free with diverse emotional expression. Your ability to add your own color to songs stands out.',
    expressionDynamic: 'Free and dynamic expressiveness is your greatest weapon. A type that shines on stage.',
    strengthAllRound: 'You have a well-balanced voice in every aspect — an all-rounder type that suits many genres!',
    strengthTempWarm: 'Warm emotion is your particular strength — you\'ll truly shine in ballads and acoustic music.',
    strengthTempCool: 'A clear, clean tone is your particular strength — you\'ll have great presence in pop and dance.',
    strengthRangeHigh: 'Freedom in the high range is your strength — your soaring highs will be captivating.',
    strengthRangeLow: 'Depth in the low range is your strength — your rich, full bass will captivate listeners.',
    strengthExprDynamic: 'Dynamic expressiveness is your strength — a performer type who shines more on stage and live!',
    strengthExprStable: 'Stable delivery is your strength — you can achieve great results in recording and narration too.',
  },
  signature: {
    ariaLabel: '{type} Voice Signature',
  },
} as const;

export default voiceProfile;
