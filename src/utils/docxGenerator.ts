import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  TabStopType,
  TabStopPosition,
} from "docx";
import { type CV } from "@/schemas/cv";

const formatDate = (dateStr: string): string => {
  if (dateStr.toLowerCase() === "present") return "Present";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const generateHarvardCV = (cvData: CV): Document => {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          // Name
          new Paragraph({
            text: cvData.name,
            heading: "Heading1",
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 240,
            },
            style: "heading1",
          }),

          // Horizontal line under name
          new Paragraph({
            alignment: AlignmentType.CENTER,
            border: {
              bottom: {
                color: "999999",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
            spacing: {
              after: 240,
            },
          }),

          // Contact info line 1
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${cvData.location} • ${cvData.contact.email} • ${cvData.contact.mobile}`,
                size: 24, // 12pt
              }),
            ],
            spacing: {
              after: 120,
            },
          }),

          // Contact info line 2
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `${cvData.contact.github} • ${cvData.contact.linkedin}`,
                size: 24,
              }),
            ],
            spacing: {
              after: 480,
            },
          }),

          // EDUCATION Section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Education",
                bold: true,
                size: 28, // 14pt
              }),
            ],
            spacing: {
              after: 360,
            },
          }),

          // Education entries
          ...cvData.education.flatMap((edu, index) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: edu.institution,
                  bold: true,
                  size: 22,
                }),
                new TextRun({
                  text: "\t", // Single tab
                }),
                new TextRun({
                  text: edu.period,
                  size: 22,
                }),
              ],
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: TabStopPosition.MAX, 
                },
              ],
              indent: {
                left: 240,
              },
              spacing: {
                after: 120,
              },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `${edu.degree} in ${edu.field}`,
                  size: 22,
                }),
              ],
              indent: {
                left: 240,
              },
              spacing: {
                after: index === cvData.education.length - 1 ? 480 : 240,
              },
            }),
          ]),

          // EXPERIENCE Section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Experience",
                bold: true,
                size: 28,
              }),
            ],
            spacing: {
              after: 360,
            },
          }),

          // Experience entries
          ...cvData.experience.flatMap((exp, index) => {
            const entries: Paragraph[] = [];

            entries.push(
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: exp.company,
                    bold: true,
                    size: 22,
                  }),
                  new TextRun({
                    text: "\t",
                  }),
                  new TextRun({
                    text: exp.location,
                    size: 22,
                  }),
                ],
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                indent: {
                  left: 240,
                },
                spacing: {
                  after: 60,
                },
              }),
            );

            entries.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: exp.position,
                    bold: true,
                    size: 22,
                  }),
                  new TextRun({
                    text: "\t",
                  }),
                  new TextRun({
                    text: `${formatDate(exp.startDate)} – ${formatDate(exp.endDate)}`,
                    size: 22,
                  }),
                ],
                indent: {
                  left: 240,
                },
                spacing: {
                  after: 180,
                },
              }),
            );

            // Description bullets
            if (exp.description && exp.description.length > 0) {
              exp.description.forEach((desc, descIndex) => {
                entries.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: desc,
                        size: 22,
                      }),
                    ],
                    bullet: {
                      level: 0,
                    },
                    indent: {
                      left: 720,
                    },
                    spacing: {
                      after: descIndex === exp.description.length - 1 ? 360 : 120,
                    },
                  }),
                );
              });
            }

            return entries;
          }),

          // TECHNICAL SKILLS & LANGUAGES Section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Technical Skills & Languages",
                bold: true,
                size: 28,
              }),
            ],
            spacing: {
              after: 360,
            },
          }),

          // Technical Skills
          new Paragraph({
            children: [
              new TextRun({
                text: "Technical Skills: ",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: cvData.skills.mainSkills.join(", "),
                size: 22,
              }),
            ],
            indent: {
              left: 240,
            },
            spacing: {
              after: 240,
            },
          }),

          // Languages
          new Paragraph({
            children: [
              new TextRun({
                text: "Languages: ",
                bold: true,
                size: 22,
              }),
              ...cvData.skills.languages.flatMap((lang, index) => {
                const elements: TextRun[] = [];
                elements.push(
                  new TextRun({
                    text: `${lang.name} (${lang.level})`,
                    size: 22,
                  }),
                );
                if (index < cvData.skills.languages.length - 1) {
                  elements.push(
                    new TextRun({
                      text: ", ",
                      size: 22,
                    }),
                  );
                }
                return elements;
              }),
            ],
            indent: {
              left: 240,
            },
            spacing: {
              after: 240,
            },
          }),
        ],
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          run: {
            size: 36, // 18pt
            bold: true,
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "default-bullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: 720,
                    hanging: 260,
                  },
                },
              },
            },
          ],
        },
      ],
    },
  });

  return doc;
};

export const downloadDocx = async (cvData: CV, filename: string = "harvard-cv.docx"): Promise<void> => {
  const doc = generateHarvardCV(cvData);
  try {
    // Use toBlob which should now work with Buffer polyfill
    const blob = await Packer.toBlob(doc);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error in downloadDocx:", error);
    throw new Error("Failed to generate DOCX file");
  }
};
