import type { Message } from "~/types/chat";

export type NemesisChatSession = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

export type NemesisFeedbackCategory =
  | "hallucination"
  | "contradiction"
  | "persona_mismatch"
  | "low_quality"
  | "unsafe"
  | "other";
