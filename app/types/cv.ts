export type CvFact = {
  label: string;
  value: string;
};

export type CvSkillLevel = "proficient" | "familiar";

export type CvSkill = {
  name: string;
  level: CvSkillLevel;
};

export type CvHobby = {
  name: string;
  detail: string;
  href?: string;
};

export type CvChapter = {
  date: string;
  summary: string;
  highlights: string[];
};

export type CvExperience = {
  organization: string;
  role: string;
  department: string;
  period: string;
  chapters: CvChapter[];
};

export type CvTraining = {
  title: string;
  place: string;
  highlights: string[];
};

export type CvProfile = {
  name: string;
  title: string;
  photoAlt: string;
  facts: CvFact[];
  skills: CvSkill[];
  certificates: string[];
  hobbies: CvHobby[];
  experience: CvExperience;
  training: CvTraining;
  manifesto: string;
};
