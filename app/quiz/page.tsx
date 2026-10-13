import type { Metadata } from "next";
import { Suspense } from "react";
import Quiz from "@/components/Quiz";

export const metadata: Metadata = {
  title: "Find the right electric car for you",
  description:
    "Describe the electric car you need in your own words, or answer four quick questions, to get the five EVs on sale in the UK that suit you best.",
  alternates: { canonical: "/quiz" },
};

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <Quiz />
    </Suspense>
  );
}
