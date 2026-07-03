// ============================================================
// Voice Profile v2 ("목BTI") — 12 Voice Type Definitions
// ============================================================
// 4 Tone Axis (clear, warm, deep, husky)
// x 3 Expression Axis (wind, flame, wave)
// = 12 unique voice personality types
//
// Each type has Korean MBTI-style content: tagline, description,
// traits, celebrity references, and a brand color.
// ============================================================

import { createT } from '@/i18n';
import type { Locale } from '@/i18n/types';
import { DEFAULT_LOCALE } from '@/i18n/types';
import type { VoiceType, ToneAxis, ExpressionAxis, VoiceTypeId } from './types';

// ============================================================
// Voice Type Registry
// ============================================================

export const VOICE_TYPES: Record<VoiceTypeId, VoiceType> = {
  // ─────────────── Clear (맑은) ───────────────

  clear_wind: {
    id: 'clear_wind',
    toneAxis: 'clear',
    expressionAxis: 'wind',
    labelKo: '맑은 바람',
    labelEn: 'Clear Wind',
    tagline: '투명하게 울리는 청아한 바람 같은 목소리',
    description:
      '당신의 목소리는 이른 아침 산 위로 불어오는 맑은 바람 같아요. ' +
      '군더더기 없이 깨끗하게 전달되는 음색이 특징이며, 안정적이고 편안한 톤이 듣는 사람의 마음을 차분하게 만듭니다. ' +
      '화려함보다 진정성으로 승부하는 타입이에요.',
    traits: ['투명한 음색', '안정적인 호흡', '차분한 전달력'],
    celebrities: ['아이유', '윤하'],
    color: '#7EC8E3',
  },

  clear_flame: {
    id: 'clear_flame',
    toneAxis: 'clear',
    expressionAxis: 'flame',
    labelKo: '맑은 불꽃',
    labelEn: 'Clear Flame',
    tagline: '맑은 음색에서 터져 나오는 강렬한 에너지',
    description:
      '맑은 수정처럼 투명한 음색인데, 그 안에 폭발적인 에너지가 숨어 있어요. ' +
      '조용히 시작했다가 순간적으로 강렬하게 터뜨리는 힘이 당신의 무기입니다. ' +
      '가창력으로 청중을 압도하는 퍼포머 기질이 강한 타입이에요.',
    traits: ['폭발적 성량', '선명한 고음', '무대형 에너지'],
    celebrities: ['에일리', '소향'],
    color: '#FF6B6B',
  },

  clear_wave: {
    id: 'clear_wave',
    toneAxis: 'clear',
    expressionAxis: 'wave',
    labelKo: '맑은 물결',
    labelEn: 'Clear Wave',
    tagline: '영롱하게 일렁이는 물결 같은 선율',
    description:
      '투명한 음색 위에 부드럽게 일렁이는 비브라토가 매력적이에요. ' +
      '감정의 결을 섬세하게 표현하는 능력이 뛰어나서, 발라드에서 특히 빛나는 타입입니다. ' +
      '한 음 한 음에 이야기를 담을 줄 아는, 감성적인 보컬리스트예요.',
    traits: ['섬세한 비브라토', '감성적 표현', '서정적 음색'],
    celebrities: ['태연', '벤'],
    color: '#A8D8EA',
  },

  // ─────────────── Warm (따뜻한) ───────────────

  warm_wind: {
    id: 'warm_wind',
    toneAxis: 'warm',
    expressionAxis: 'wind',
    labelKo: '따뜻한 바람',
    labelEn: 'Warm Wind',
    tagline: '포근하게 감싸 안는 봄바람 같은 목소리',
    description:
      '당신의 목소리는 따뜻한 봄바람처럼 듣는 사람을 편안하게 감싸요. ' +
      '풍성한 중저음에 안정감 있는 호흡이 더해져, 오래 들어도 피로하지 않은 목소리입니다. ' +
      '라디오 DJ나 낭독처럼 "계속 듣고 싶은 목소리"의 정석이에요.',
    traits: ['포근한 중저음', '편안한 안정감', '자연스러운 호흡'],
    celebrities: ['성시경', '이적'],
    color: '#FFB347',
  },

  warm_flame: {
    id: 'warm_flame',
    toneAxis: 'warm',
    expressionAxis: 'flame',
    labelKo: '따뜻한 불꽃',
    labelEn: 'Warm Flame',
    tagline: '깊은 온기 속에서 타오르는 열정의 불꽃',
    description:
      '따뜻한 음색 안에 강렬한 에너지를 숨기고 있는 당신은, 감정을 폭발시킬 때 진짜 빛나요. ' +
      '중저음의 깊이와 고음의 파워를 모두 갖추고 있어서, 한 곡 안에서 극적인 드라마를 만들어냅니다. ' +
      '노래로 이야기하는 타고난 스토리텔러예요.',
    traits: ['드라마틱한 표현', '파워풀한 감성', '넓은 다이나믹'],
    celebrities: ['박효신', '김범수'],
    color: '#FF8C42',
  },

  warm_wave: {
    id: 'warm_wave',
    toneAxis: 'warm',
    expressionAxis: 'wave',
    labelKo: '따뜻한 물결',
    labelEn: 'Warm Wave',
    tagline: '깊은 호수에 잔잔히 퍼지는 물결 같은 울림',
    description:
      '포근한 음색 위에 잔잔히 흐르는 비브라토가 특별한 깊이를 만들어요. ' +
      '감정을 절제하면서도 풍부하게 전달하는 능력이 탁월해서, 한 소절만으로도 사람을 울릴 수 있습니다. ' +
      '세월이 쌓일수록 더 깊어지는 목소리의 주인이에요.',
    traits: ['풍부한 울림', '절제된 감성', '깊은 여운'],
    celebrities: ['이소라', '거미'],
    color: '#E8A87C',
  },

  // ─────────────── Deep (깊은) ───────────────

  deep_wind: {
    id: 'deep_wind',
    toneAxis: 'deep',
    expressionAxis: 'wind',
    labelKo: '깊은 바람',
    labelEn: 'Deep Wind',
    tagline: '대지를 고요히 쓸고 지나가는 깊은 바람',
    description:
      '묵직한 저음이 공간을 가득 채우는 당신의 목소리는, 말 한마디에도 무게가 실려요. ' +
      '과하지 않은 절제된 발성이 오히려 신뢰감과 카리스마를 만들어냅니다. ' +
      '"목소리만으로 분위기를 바꾸는 사람"이라는 말을 자주 듣는 타입이에요.',
    traits: ['묵직한 저음', '절제된 카리스마', '신뢰감 있는 톤'],
    celebrities: ['나얼', '이승기'],
    color: '#6B7B8D',
  },

  deep_flame: {
    id: 'deep_flame',
    toneAxis: 'deep',
    expressionAxis: 'flame',
    labelKo: '깊은 불꽃',
    labelEn: 'Deep Flame',
    tagline: '깊은 곳에서 용암처럼 터져 나오는 힘',
    description:
      '바닥에서부터 올라오는 묵직한 에너지가 당신 목소리의 핵심이에요. ' +
      '평소에는 깊고 차분하지만, 감정이 실리면 마치 화산처럼 폭발적으로 변하는 반전 매력의 소유자입니다. ' +
      '록 발라드나 파워풀한 곡에서 진가가 드러나는 타입이에요.',
    traits: ['저음의 파워', '폭발적 반전', '강렬한 존재감'],
    celebrities: ['김종국', '임창정'],
    color: '#D35400',
  },

  deep_wave: {
    id: 'deep_wave',
    toneAxis: 'deep',
    expressionAxis: 'wave',
    labelKo: '깊은 물결',
    labelEn: 'Deep Wave',
    tagline: '깊은 바다에서 천천히 밀려오는 거대한 파도',
    description:
      '넓고 깊은 음역에서 유연하게 움직이는 당신의 목소리는 마치 바다 깊은 곳의 해류 같아요. ' +
      '풍부한 저음과 부드러운 움직임이 어우러져 웅장하면서도 서정적인 분위기를 만듭니다. ' +
      '시간의 무게를 담은 클래식한 매력의 보컬리스트예요.',
    traits: ['웅장한 스케일', '유연한 움직임', '클래식한 깊이'],
    celebrities: ['이문세', '조용필'],
    color: '#2C3E6B',
  },

  // ─────────────── Husky (허스키) ───────────────

  husky_wind: {
    id: 'husky_wind',
    toneAxis: 'husky',
    expressionAxis: 'wind',
    labelKo: '허스키 바람',
    labelEn: 'Husky Wind',
    tagline: '건조한 사막을 스치는 바람 같은 매력적인 숨결',
    description:
      '약간의 거친 질감이 오히려 독보적인 매력이 되는 목소리예요. ' +
      '절제된 표현 속에 담긴 바람 같은 숨결이 듣는 사람에게 묘한 감성을 전달합니다. ' +
      '힘을 빼면 뺄수록 더 매력적으로 들리는, R&B와 어쿠스틱에 어울리는 감성 보컬이에요.',
    traits: ['독보적 음색', '바람 같은 숨결', '무드 있는 감성'],
    celebrities: ['크러쉬', '딘'],
    color: '#B0A090',
  },

  husky_flame: {
    id: 'husky_flame',
    toneAxis: 'husky',
    expressionAxis: 'flame',
    labelKo: '허스키 불꽃',
    labelEn: 'Husky Flame',
    tagline: '거친 모래바람 속에서 타오르는 강렬한 불꽃',
    description:
      '거칠고 날것의 매력을 가진 당신의 목소리는 한 번 들으면 잊을 수 없어요. ' +
      '허스키한 질감 위에 강렬한 에너지를 실어 보내는 스타일로, 특히 라이브에서 폭발적인 존재감을 발휘합니다. ' +
      '장르를 넘나들며 자기만의 색깔을 확실하게 가진 타입이에요.',
    traits: ['날것의 에너지', '강렬한 개성', '라이브형 폭발력'],
    celebrities: ['자이언티', '박재범'],
    color: '#C0392B',
  },

  husky_wave: {
    id: 'husky_wave',
    toneAxis: 'husky',
    expressionAxis: 'wave',
    labelKo: '허스키 물결',
    labelEn: 'Husky Wave',
    tagline: '안개 낀 바다 위를 부드럽게 흐르는 물결',
    description:
      '몽환적인 허스키 톤에 부드러운 움직임이 더해진 당신의 목소리는 마치 안개 낀 바다 같아요. ' +
      '감정의 결을 섬세하게 흔들어 놓는 능력이 있어서, 듣는 사람을 자연스럽게 당신의 세계로 끌어들입니다. ' +
      '대체 불가능한 분위기를 가진 아티스트 타입이에요.',
    traits: ['몽환적 분위기', '섬세한 감정선', '독자적 세계관'],
    celebrities: ['헤이즈', '백예린'],
    color: '#9B8EC1',
  },
};

// ============================================================
// Lookup
// ============================================================

/**
 * Get the VoiceType definition for a given tone + expression combination.
 */
export function getVoiceType(
  tone: ToneAxis,
  expression: ExpressionAxis,
): VoiceType {
  const id: VoiceTypeId = `${tone}_${expression}`;
  return VOICE_TYPES[id];
}

/**
 * Get the VoiceType definition by ID.
 */
export function getVoiceTypeById(id: VoiceTypeId): VoiceType {
  return VOICE_TYPES[id];
}

/**
 * Get all 12 voice types as an array.
 */
export function getAllVoiceTypes(): VoiceType[] {
  return Object.values(VOICE_TYPES);
}

/**
 * Get all voice types for a specific tone axis.
 */
export function getVoiceTypesByTone(tone: ToneAxis): VoiceType[] {
  return getAllVoiceTypes().filter((vt) => vt.toneAxis === tone);
}

/**
 * Get all voice types for a specific expression axis.
 */
export function getVoiceTypesByExpression(
  expression: ExpressionAxis,
): VoiceType[] {
  return getAllVoiceTypes().filter((vt) => vt.expressionAxis === expression);
}

// ============================================================
// Localized Voice Type Accessors
// ============================================================

export interface LocalizedVoiceType {
  id: VoiceTypeId;
  toneAxis: ToneAxis;
  expressionAxis: ExpressionAxis;
  label: string;
  tagline: string;
  description: string;
  traits: string[];
  celebrities: string[];
  color: string;
}

/**
 * Get a localized voice type by ID.
 * Returns label, tagline, description, traits, and celebrities in the given locale.
 */
export function getLocalizedVoiceType(
  typeId: VoiceTypeId,
  locale: Locale = DEFAULT_LOCALE,
): LocalizedVoiceType {
  const base = VOICE_TYPES[typeId];
  const t = createT(locale, 'voiceProfile');

  return {
    id: base.id,
    toneAxis: base.toneAxis,
    expressionAxis: base.expressionAxis,
    label: t(`types.${typeId}.label`),
    tagline: t(`types.${typeId}.tagline`),
    description: t(`types.${typeId}.description`),
    traits: t(`types.${typeId}.traits`).split(','),
    celebrities: t(`types.${typeId}.celebrities`).split(','),
    color: base.color,
  };
}

/**
 * Get all 12 voice types localized.
 */
export function getAllLocalizedVoiceTypes(locale: Locale = DEFAULT_LOCALE): LocalizedVoiceType[] {
  return (Object.keys(VOICE_TYPES) as VoiceTypeId[]).map(
    (id) => getLocalizedVoiceType(id, locale),
  );
}

/**
 * Get localized tone axis labels.
 */
export function getLocalizedToneLabels(locale: Locale = DEFAULT_LOCALE): Record<ToneAxis, string> {
  const t = createT(locale, 'voiceProfile');
  return {
    clear: t('toneLabels.clear'),
    warm: t('toneLabels.warm'),
    deep: t('toneLabels.deep'),
    husky: t('toneLabels.husky'),
  };
}

/**
 * Get localized expression axis labels.
 */
export function getLocalizedExpressionLabels(locale: Locale = DEFAULT_LOCALE): Record<ExpressionAxis, string> {
  const t = createT(locale, 'voiceProfile');
  return {
    wind: t('expressionLabels.wind'),
    flame: t('expressionLabels.flame'),
    wave: t('expressionLabels.wave'),
  };
}
