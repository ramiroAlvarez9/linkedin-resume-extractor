import { type JSX } from "react";
import { type CV } from "@/schemas/cv";

interface HarvardCVProps {
  cvData: CV;
}

function HarvardCV({ cvData }: HarvardCVProps): JSX.Element {
  const formatDate = (dateStr: string): string => {
    if (dateStr.toLowerCase() === "present") return "Present";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="w-[210mm] h-[297mm] mx-auto bg-white p-8 text-black font-sans text-xs leading-tight overflow-auto shadow-lg [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400/70">
      <div className="text-center mb-6">
        <div className="relative">
          <h1 className="text-lg font-bold mb-2">{cvData.name}</h1>
          <div className="w-full h-px bg-gray-400 mb-4"></div>
        </div>
        <p className="text-sm">
          {cvData.location} • {cvData.contact.email} • {cvData.contact.mobile}
        </p>
        <p className="text-sm mt-1">
          {cvData.contact.github} • {cvData.contact.linkedin}
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-center text-sm font-bold mb-3">Education</h2>
        {cvData.education.map((edu, index) => (
          <div key={index} className="mb-4 ml-2">
            <div className="flex justify-between items-start">
              <div className="font-bold">{edu.institution}</div>
              <div>{edu.period}</div>
            </div>
            <div className="mt-1">
              {edu.degree} in {edu.field}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-center text-sm font-bold mb-3">Experience</h2>
        {cvData.experience.map((exp, index) => (
          <div key={index} className="mb-6 ml-2">
            <div className="flex flex-row justify-between">
              <div className="w-[50%] flex flex-col">
                <span className="font-bold">{exp.company}</span>
                <span className="font-bold">{exp.position}</span>
              </div>

              <div className="w-[50%] flex flex-col items-end">
                <span>{exp.location}</span>
                <span>
                  {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                </span>
              </div>

            </div>
            <ul className="mt-2 ml-6 space-y-1">
              {exp.description?.map((description, index) => (<li key={`${exp.company}+${index}`} className="text-sm list-disc">
                {description}
              </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-center text-sm font-bold mb-3">Technical Skills & Languages</h2>
        <div className="ml-2 space-y-2">
          <div className="text-sm">
            <span className="font-bold">Technical Skills:</span> {cvData.skills.mainSkills.join(", ")}
          </div>
          <div className="text-sm">
            <span className="font-bold">Languages:</span>{" "}
            {cvData.skills.languages.map((lang, index) => (
              <span key={index}>
                {lang.name} ({lang.level}){index < cvData.skills.languages.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HarvardCV;
