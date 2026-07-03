import type { VocabWord } from '../types';
import vocabData from '../../vocab_n5.json';

export const ALL_CATEGORIES = [
  'Thời gian',
  'Gia đình',
  'Người',
  'Nơi chốn',
  'Đồ vật',
  'Thức ăn',
  'Sức khỏe',
  'Trường học',
  'Động từ',
  'Tính từ',
  'Trạng từ',
  'Số đếm',
  'Tự nhiên',
  'Giải trí',
  'Vị trí',
  'Khác',
] as const;

export const ALL_WORDS: VocabWord[] = vocabData as VocabWord[];

export const BOARD_SIZE = 5;
export const SET_SIZE = 20;
export const ANIMATION_DURATION = 500;
