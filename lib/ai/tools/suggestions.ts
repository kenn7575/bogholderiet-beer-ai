import { z } from "zod"

export const suggestOptionsTool = {
  name: "suggest_options",
  description:
    "Vis klikbare forslag til brugeren så de kan indsnævre søgningen. Brug dette når der er for mange resultater eller du vil guide brugeren. Inkluder en kort spørgsmålstekst og en liste af forslag.",
  parameters: z.object({
    question: z
      .string()
      .describe(
        'Spørgsmål eller opfordring til brugeren, f.eks. "Hvilken ølstil foretrækker du?"'
      ),
    suggestions: z
      .array(
        z.object({
          label: z.string().describe("Tekst der vises på knappen"),
          value: z
            .string()
            .describe("Besked der sendes når brugeren klikker på knappen"),
        })
      )
      .min(2)
      .max(12)
      .describe("Liste af klikbare forslag"),
  }),
  async execute({
    question,
    suggestions,
  }: {
    question: string
    suggestions: { label: string; value: string }[]
  }) {
    return { question, suggestions }
  },
} as const
