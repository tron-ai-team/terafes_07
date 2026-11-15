import React from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { HelpCircle, ChevronRight, MessageSquare, Mic } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const faqs = [
    {
      q: 'Does TRON AI require microphone access?',
      a: 'Microphone access enables real-time spoken interview practice, but you can also use manual keyboard text input if a microphone is unavailable.',
    },
    {
      q: 'Which Japanese levels are supported?',
      a: 'The system adapts questions and keigo complexity according to difficulty levels (Beginner, Intermediate, Advanced) aligned with JLPT N3 to N1 competencies.',
    },
    {
      q: 'How does CV personalization work?',
      a: 'When you upload a PDF resume, TRON AI parses your technical stack, projects, and certifications to tailor behavioral and architectural questions specifically to your background.',
    },
    {
      q: 'How are the scores calculated?',
      a: 'Scores are generated across five core metrics: Japanese Fluency, Technical Logic, Problem Solving, STAR Structure, and Company Cultural Fit.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
          Help & Documentation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Frequently asked questions, microphone setup tips, and guidance for your interview sessions.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <GlassCard key={idx} className="p-5 space-y-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed pl-6">{faq.a}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
