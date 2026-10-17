export interface LyricWord {
  text: string;
  start: number;
  end: number;
  duration: number;
}

export interface LyricLine {
  start: number;
  end: number;
  text: string;
  translation?: string;
  words?: LyricWord[];
  /** 兼容旧代码调用（可选） */
  time?: number;
}
