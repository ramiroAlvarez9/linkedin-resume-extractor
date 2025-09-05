import * as v from "valibot";

export const ContactSchema = v.object({
  github: v.string(),
  mobile: v.string(),
  email: v.pipe(v.string(), v.email()),
  linkedin: v.string(),
});

export const SkillSchema = v.object({
  mainSkills: v.array(v.string()),
  languages: v.array(
    v.object({
      name: v.string(),
      level: v.string(),
    }),
  ),
});

export const ExperienceSchema = v.object({
  company: v.string(),
  position: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  duration: v.string(),
  location: v.string(),
  description: v.optional(v.array(v.string())),
});

export const EducationSchema = v.object({
  institution: v.string(),
  degree: v.string(),
  field: v.string(),
  period: v.string(),
});

export const CVSchema = v.object({
  contact: ContactSchema,
  name: v.string(),
  title: v.string(),
  location: v.string(),
  summary: v.string(),
  skills: SkillSchema,
  experience: v.array(ExperienceSchema),
  education: v.array(EducationSchema),
});

export type CV = v.InferInput<typeof CVSchema>;
