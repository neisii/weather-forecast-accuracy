/**
 * 자전거 라이딩 추천 시스템 타입 정의
 *
 * Phase 7: 기본 점수 시스템
 * - 날씨 조건 기반 점수 계산
 * - 추천도 5단계 분류
 * - 복장 추천
 */

/**
 * 라이딩 추천도 레벨
 */
export type RecommendationLevel =
  | 'excellent'   // 최고! 🚴‍♂️ (80-100점)
  | 'good'        // 좋음 👍 (60-79점)
  | 'fair'        // 보통 🤔 (40-59점)
  | 'poor'        // 비추천 👎 (20-39점)
  | 'dangerous';  // 위험 ⚠️ (0-19점)

/**
 * 복장 아이템
 */
export interface ClothingItem {
  /** 아이템 이름 */
  name: string;
  /** 필수 여부 */
  essential: boolean;
}

/**
 * 자전거 라이딩 점수 및 추천 정보
 */
export interface CyclingScore {
  /** 종합 점수 (0-100) */
  score: number;
  /** 추천도 레벨 */
  recommendation: RecommendationLevel;
  /** 점수에 영향을 준 이유 목록 */
  reasons: string[];
  /** 권장 복장 목록 */
  clothing: ClothingItem[];
}

/**
 * 추천도 레벨별 표시 정보
 */
export interface RecommendationDisplay {
  /** 한글 텍스트 */
  text: string;
  /** 이모지 */
  emoji: string;
  /** CSS 클래스명 */
  className: string;
  /** 색상 (gradient) */
  color: {
    from: string;
    to: string;
  };
}

/**
 * 추천도 레벨별 표시 정보 매핑
 */
export const RECOMMENDATION_DISPLAY: Record<RecommendationLevel, RecommendationDisplay> = {
  excellent: {
    text: '최고!',
    emoji: '🚴‍♂️',
    className: 'score-excellent',
    color: { from: '#667eea', to: '#764ba2' }
  },
  good: {
    text: '좋음',
    emoji: '👍',
    className: 'score-good',
    color: { from: '#f093fb', to: '#f5576c' }
  },
  fair: {
    text: '보통',
    emoji: '🤔',
    className: 'score-fair',
    color: { from: '#ffecd2', to: '#fcb69f' }
  },
  poor: {
    text: '비추천',
    emoji: '👎',
    className: 'score-poor',
    color: { from: '#ff9a9e', to: '#fecfef' }
  },
  dangerous: {
    text: '위험',
    emoji: '⚠️',
    className: 'score-dangerous',
    color: { from: '#ff0844', to: '#ffb199' }
  }
};
