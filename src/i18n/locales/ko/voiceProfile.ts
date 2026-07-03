const voiceProfile = {
  intro: {
    sectionLabel: '보이스 프로필',
    title: '내 목소리는 어떤 타입?',
    subtitle: '3번의 짧은 테스트로 12가지 보이스 타입 중 나를 찾아보세요. 약 90초 소요.',
    typeGridLabel: '12가지 보이스 타입',
    defaultMic: '기본 마이크',
    micLabel: '마이크 {id}',
    startTest: '테스트 시작하기',
  },
  analyzing: {
    title: '분석 중',
    subtitle: '목소리를 분석하고 있어요',
  },
  result: {
    sectionLabel: '보이스 프로필 결과',
    retry: '다시 측정하기',
    footerNote: '보이스 프로필은 현재 목소리 상태를 반영합니다.',
    footerNote2: '컨디션에 따라 결과가 달라질 수 있어요.',
    celebrityMatch: '{names}과 비슷한 목소리',
    celebritySubtext: '비슷한 음색 특성을 가진 보컬리스트',
    basePitch: '기본 음높이 {hz}Hz',
    rangeOctaves: '음역 {octaves}옥타브',
    stabilityScore: '안정성 {score}점',
  },
  test: {
    micError: '마이크 오류',
    preparing: '준비 중...',
    testPhase: '테스트 {current}/{total}',
    getReady: '준비하세요',
    recording: '녹음중',
    volumeAria: '음량',
    phaseComplete: '{name} 완료!',
    nextTest: '다음 테스트',
    insufficientVoice: '소리가 충분히 감지되지 않았어요',
    insufficientVoiceDesc: '마이크 가까이에서 조금 더 크게 소리를 내주세요.',
    retry: '다시 시도',
    skip: '건너뛰기',
  },
  share: {
    canvasHeader: 'HAMONI 보이스 프로필',
    shareTitle: 'HAMONI 보이스 프로필 — {type}',
    shareText: '내 보이스 타입은 "{type}"',
    shareTemperatureWarm: '따뜻한',
    shareTemperatureCool: '시원한',
    shareRangeHigh: '고음형',
    shareRangeLow: '저음형',
    shareRangeMid: '중음형',
    shareExpressionDynamic: '역동적인',
    shareExpressionStable: '안정적인',
    shareFormat: '나의 목BTI는 "{label}"! {temperature} 음색의 {range}, {expression} 표현 스타일 🎤',
    generating: '생성 중...',
    share: '공유하기',
    download: '이미지 저장',
  },
  types: {
    clear_wind: {
      label: '맑은 바람',
      tagline: '투명하게 울리는 청아한 바람 같은 목소리',
      description:
        '당신의 목소리는 이른 아침 산 위로 불어오는 맑은 바람 같아요. ' +
        '군더더기 없이 깨끗하게 전달되는 음색이 특징이며, 안정적이고 편안한 톤이 듣는 사람의 마음을 차분하게 만듭니다. ' +
        '화려함보다 진정성으로 승부하는 타입이에요.',
      traits: '투명한 음색,안정적인 호흡,차분한 전달력',
      celebrities: '아이유,윤하',
    },
    clear_flame: {
      label: '맑은 불꽃',
      tagline: '맑은 음색에서 터져 나오는 강렬한 에너지',
      description:
        '맑은 수정처럼 투명한 음색인데, 그 안에 폭발적인 에너지가 숨어 있어요. ' +
        '조용히 시작했다가 순간적으로 강렬하게 터뜨리는 힘이 당신의 무기입니다. ' +
        '가창력으로 청중을 압도하는 퍼포머 기질이 강한 타입이에요.',
      traits: '폭발적 성량,선명한 고음,무대형 에너지',
      celebrities: '에일리,소향',
    },
    clear_wave: {
      label: '맑은 물결',
      tagline: '영롱하게 일렁이는 물결 같은 선율',
      description:
        '투명한 음색 위에 부드럽게 일렁이는 비브라토가 매력적이에요. ' +
        '감정의 결을 섬세하게 표현하는 능력이 뛰어나서, 발라드에서 특히 빛나는 타입입니다. ' +
        '한 음 한 음에 이야기를 담을 줄 아는, 감성적인 보컬리스트예요.',
      traits: '섬세한 비브라토,감성적 표현,서정적 음색',
      celebrities: '태연,벤',
    },
    warm_wind: {
      label: '따뜻한 바람',
      tagline: '포근하게 감싸 안는 봄바람 같은 목소리',
      description:
        '당신의 목소리는 따뜻한 봄바람처럼 듣는 사람을 편안하게 감싸요. ' +
        '풍성한 중저음에 안정감 있는 호흡이 더해져, 오래 들어도 피로하지 않은 목소리입니다. ' +
        '라디오 DJ나 낭독처럼 "계속 듣고 싶은 목소리"의 정석이에요.',
      traits: '포근한 중저음,편안한 안정감,자연스러운 호흡',
      celebrities: '성시경,이적',
    },
    warm_flame: {
      label: '따뜻한 불꽃',
      tagline: '깊은 온기 속에서 타오르는 열정의 불꽃',
      description:
        '따뜻한 음색 안에 강렬한 에너지를 숨기고 있는 당신은, 감정을 폭발시킬 때 진짜 빛나요. ' +
        '중저음의 깊이와 고음의 파워를 모두 갖추고 있어서, 한 곡 안에서 극적인 드라마를 만들어냅니다. ' +
        '노래로 이야기하는 타고난 스토리텔러예요.',
      traits: '드라마틱한 표현,파워풀한 감성,넓은 다이나믹',
      celebrities: '박효신,김범수',
    },
    warm_wave: {
      label: '따뜻한 물결',
      tagline: '깊은 호수에 잔잔히 퍼지는 물결 같은 울림',
      description:
        '포근한 음색 위에 잔잔히 흐르는 비브라토가 특별한 깊이를 만들어요. ' +
        '감정을 절제하면서도 풍부하게 전달하는 능력이 탁월해서, 한 소절만으로도 사람을 울릴 수 있습니다. ' +
        '세월이 쌓일수록 더 깊어지는 목소리의 주인이에요.',
      traits: '풍부한 울림,절제된 감성,깊은 여운',
      celebrities: '이소라,거미',
    },
    deep_wind: {
      label: '깊은 바람',
      tagline: '대지를 고요히 쓸고 지나가는 깊은 바람',
      description:
        '묵직한 저음이 공간을 가득 채우는 당신의 목소리는, 말 한마디에도 무게가 실려요. ' +
        '과하지 않은 절제된 발성이 오히려 신뢰감과 카리스마를 만들어냅니다. ' +
        '"목소리만으로 분위기를 바꾸는 사람"이라는 말을 자주 듣는 타입이에요.',
      traits: '묵직한 저음,절제된 카리스마,신뢰감 있는 톤',
      celebrities: '나얼,이승기',
    },
    deep_flame: {
      label: '깊은 불꽃',
      tagline: '깊은 곳에서 용암처럼 터져 나오는 힘',
      description:
        '바닥에서부터 올라오는 묵직한 에너지가 당신 목소리의 핵심이에요. ' +
        '평소에는 깊고 차분하지만, 감정이 실리면 마치 화산처럼 폭발적으로 변하는 반전 매력의 소유자입니다. ' +
        '록 발라드나 파워풀한 곡에서 진가가 드러나는 타입이에요.',
      traits: '저음의 파워,폭발적 반전,강렬한 존재감',
      celebrities: '김종국,임창정',
    },
    deep_wave: {
      label: '깊은 물결',
      tagline: '깊은 바다에서 천천히 밀려오는 거대한 파도',
      description:
        '넓고 깊은 음역에서 유연하게 움직이는 당신의 목소리는 마치 바다 깊은 곳의 해류 같아요. ' +
        '풍부한 저음과 부드러운 움직임이 어우러져 웅장하면서도 서정적인 분위기를 만듭니다. ' +
        '시간의 무게를 담은 클래식한 매력의 보컬리스트예요.',
      traits: '웅장한 스케일,유연한 움직임,클래식한 깊이',
      celebrities: '이문세,조용필',
    },
    husky_wind: {
      label: '허스키 바람',
      tagline: '건조한 사막을 스치는 바람 같은 매력적인 숨결',
      description:
        '약간의 거친 질감이 오히려 독보적인 매력이 되는 목소리예요. ' +
        '절제된 표현 속에 담긴 바람 같은 숨결이 듣는 사람에게 묘한 감성을 전달합니다. ' +
        '힘을 빼면 뺄수록 더 매력적으로 들리는, R&B와 어쿠스틱에 어울리는 감성 보컬이에요.',
      traits: '독보적 음색,바람 같은 숨결,무드 있는 감성',
      celebrities: '크러쉬,딘',
    },
    husky_flame: {
      label: '허스키 불꽃',
      tagline: '거친 모래바람 속에서 타오르는 강렬한 불꽃',
      description:
        '거칠고 날것의 매력을 가진 당신의 목소리는 한 번 들으면 잊을 수 없어요. ' +
        '허스키한 질감 위에 강렬한 에너지를 실어 보내는 스타일로, 특히 라이브에서 폭발적인 존재감을 발휘합니다. ' +
        '장르를 넘나들며 자기만의 색깔을 확실하게 가진 타입이에요.',
      traits: '날것의 에너지,강렬한 개성,라이브형 폭발력',
      celebrities: '자이언티,박재범',
    },
    husky_wave: {
      label: '허스키 물결',
      tagline: '안개 낀 바다 위를 부드럽게 흐르는 물결',
      description:
        '몽환적인 허스키 톤에 부드러운 움직임이 더해진 당신의 목소리는 마치 안개 낀 바다 같아요. ' +
        '감정의 결을 섬세하게 흔들어 놓는 능력이 있어서, 듣는 사람을 자연스럽게 당신의 세계로 끌어들입니다. ' +
        '대체 불가능한 분위기를 가진 아티스트 타입이에요.',
      traits: '몽환적 분위기,섬세한 감정선,독자적 세계관',
      celebrities: '헤이즈,백예린',
    },
  },
  toneLabels: {
    clear: '맑은',
    warm: '따뜻한',
    deep: '깊은',
    husky: '허스키',
  },
  expressionLabels: {
    wind: '바람',
    flame: '불꽃',
    wave: '물결',
  },
  spectrumLabels: {
    temperature: { left: '차가운', right: '따뜻한', label: '음색 온도' },
    range: { left: '저음형', right: '고음형', label: '음역 지대' },
    expression: { left: '안정적', right: '역동적', label: '표현 스타일' },
  },
  testPhases: {
    sustained: {
      name: '편한 소리 내기',
      instruction: '편안한 음높이에서 "아~"를 길게 유지해주세요. 두 번 반복합니다.',
      measuresLabel: '음색과 안정성을 측정합니다',
    },
    rangeSweep: {
      name: '음역 탐색',
      instruction: '가장 낮은 음부터 높은 음까지 천천히 올라간 후, 다시 내려오세요.',
      measuresLabel: '음역대와 유연성을 측정합니다',
    },
    expression: {
      name: '표현 도전',
      instruction: '편한 음에서 시작해 점점 크게, 다시 점점 작게 발성해주세요. 자유롭게 표현해보세요!',
      measuresLabel: '다이나믹과 표현력을 측정합니다',
    },
  },
  description: {
    temperatureCool: '서늘하고 투명한 질감이 당신 목소리의 첫인상이에요.',
    temperatureNeutral: '차가움과 따뜻함 사이 절묘한 균형이 당신 목소리의 매력이에요.',
    temperatureSlightlyWarm: '은은한 온기가 감도는 음색이 편안한 분위기를 만들어요.',
    temperatureWarm: '듣는 사람을 포근하게 감싸는 따뜻한 온도가 느껴져요.',
    rangeLow: '저음역이 특히 풍성한 타입이에요. {octaveText}',
    rangeMid: '중음역이 안정적인 균형 잡힌 타입이에요. {octaveText}',
    rangeHigh: '고음역에서 빛나는 타입이에요. {octaveText}',
    octavesWide: '약 {octaves}옥타브의 넓은 음역대를 가지고 있어요.',
    octavesMedium: '약 {octaves}옥타브의 음역대를 활용하고 있어요.',
    octavesNarrow: '현재 약 {octaves}옥타브 범위에서 안정적으로 발성하고 있어요.',
    expressionStable: '일정하게 유지되는 안정적인 발성이 큰 장점이에요. 편안하게 오래 들을 수 있는 목소리랍니다.',
    expressionBalanced: '안정감 속에 적절한 변화를 줄 줄 아는 균형 잡힌 표현력이 있어요.',
    expressionFree: '다양한 감정 표현이 자유로운 편이에요. 노래에 자신만의 색깔을 입히는 능력이 돋보여요.',
    expressionDynamic: '자유롭고 역동적인 표현력이 당신의 가장 큰 무기예요. 무대 위에서 빛나는 타입이랍니다.',
    strengthAllRound: '모든 면에서 균형 잡힌 목소리를 가지고 있어요 — 다양한 장르에 잘 어울리는 올라운더 타입!',
    strengthTempWarm: '특히 따뜻한 감성이 강점이에요 — 발라드나 어쿠스틱에서 진가를 발휘할 거예요.',
    strengthTempCool: '특히 선명하고 깔끔한 음색이 강점이에요 — 팝이나 댄스곡에서 존재감이 빛날 거예요.',
    strengthRangeHigh: '고음역의 자유로움이 강점이에요 — 시원하게 뻗는 고음이 매력적일 거예요.',
    strengthRangeLow: '저음역의 깊이가 강점이에요 — 깊고 풍성한 저음이 듣는 사람을 사로잡을 거예요.',
    strengthExprDynamic: '역동적인 표현력이 강점이에요 — 라이브나 무대에서 더 빛나는 퍼포머 타입!',
    strengthExprStable: '안정적인 발성이 강점이에요 — 녹음이나 내레이션에서도 훌륭한 결과를 낼 수 있어요.',
  },
  signature: {
    ariaLabel: '{type} 보이스 시그니처',
  },
} as const;

export default voiceProfile;
