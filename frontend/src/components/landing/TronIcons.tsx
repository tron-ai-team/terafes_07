import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * AI Chat Icon
 * - Elegant conversation geometry
 * - Subtle neural connection details
 * - Minimalist and professional
 */
export const AiChatIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Refined speech bubble contour */}
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Subtle Neural Network connection details */}
    <line
      x1="8.5"
      y1="11.5"
      x2="12"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.75"
    />
    <line
      x1="12"
      y1="13.5"
      x2="15.5"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.75"
    />
    <line
      x1="8.5"
      y1="11.5"
      x2="15.5"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeDasharray="1 1.5"
      opacity="0.5"
    />
    <circle cx="8.5" cy="11.5" r="1.4" fill="currentColor" />
    <circle cx="12" cy="13.5" r="1.4" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1.4" fill="currentColor" />
  </svg>
);

/**
 * AI Voice Icon
 * - Audio waveform-inspired geometry
 * - Refined microphone structure
 * - Subtle animated waveform bars on hover
 */
export const AiVoiceIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Left Waveform Bars */}
    <line
      x1="3"
      y1="10"
      x2="3"
      y2="14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="tron-wave-bar-1 origin-center transition-transform"
    />
    <line
      x1="5.5"
      y1="7.5"
      x2="5.5"
      y2="16.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="tron-wave-bar-2 origin-center transition-transform"
    />

    {/* Center Microphone geometry */}
    <rect
      x="9.5"
      y="4.5"
      width="5"
      height="8.5"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 10.5v1.2a4.5 4.5 0 0 0 9 0v-1.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="16.2"
      x2="12"
      y2="19.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="9.5"
      y1="19.5"
      x2="14.5"
      y2="19.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    {/* Right Waveform Bars */}
    <line
      x1="18.5"
      y1="7.5"
      x2="18.5"
      y2="16.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="tron-wave-bar-3 origin-center transition-transform"
    />
    <line
      x1="21"
      y1="10"
      x2="21"
      y2="14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="tron-wave-bar-4 origin-center transition-transform"
    />
  </svg>
);

/**
 * Interview Practice Icon
 * - Professional human silhouette
 * - Conversation and interview feedback geometry
 * - Real-time coaching elements
 */
export const InterviewPracticeIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Human silhouette */}
    <circle
      cx="8"
      cy="7.5"
      r="3.2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M3 18.5c0-2.8 2.3-5 5.2-5h0c2.9 0 5.2 2.2 5.2 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    {/* Speech & Evaluation dialogue element */}
    <path
      d="M14 5.5h5a2.5 2.5 0 0 1 2.5 2.5v3.2a2.5 2.5 0 0 1-2.5 2.5h-1.2l-2.2 2v-2h-1.6a2.5 2.5 0 0 1-2.5-2.5V8a2.5 2.5 0 0 1 2.5-2.5z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Checkmark inside interview dialogue */}
    <path
      d="M16.2 9.5l1.4 1.4 2.8-2.8"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Create CV Icon
 * - Structured document symbol
 * - Elegant typography lines
 * - Professional career certification accent
 */
export const CreateCvIcon: React.FC<IconProps> = ({ size = 24, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Document sheet with folded top-right corner */}
    <path
      d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L14.5 3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 3v5.5h5.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Structured typography lines */}
    <line
      x1="8"
      y1="10"
      x2="11.5"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="8"
      y1="13.5"
      x2="16"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="8"
      y1="17"
      x2="13.5"
      y2="17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Document stamp / career badge accent */}
    <circle cx="16.5" cy="17" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Benefit: 100% Free
 * - Elegant sparkling crystal prism representing unlocked, friction-free intelligence
 */
export const BenefitFreeIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M12 2.5L14.4 9.6L21.5 12L14.4 14.4L12 21.5L9.6 14.4L2.5 12L9.6 9.6L12 2.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

/**
 * Benefit: Bilingual AI (JP/EN)
 * - Harmonious bilingual synthesis nexus (Latin 'A' + Japanese '文' character geometry)
 */
export const BenefitBilingualIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Global interconnected circles */}
    <circle
      cx="8.5"
      cy="12"
      r="5.5"
      stroke="currentColor"
      strokeWidth="1.6"
      opacity="0.85"
    />
    <circle
      cx="15.5"
      cy="12"
      r="5.5"
      stroke="currentColor"
      strokeWidth="1.6"
      opacity="0.85"
    />

    {/* 'A' Glyph in left circle */}
    <path
      d="M7 13.5L8.5 9.5L10 13.5M7.5 12.5h2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* '文' Kanji Radical in right circle */}
    <path
      d="M14 10.2h3M15.5 9v1.2M14.2 13.8l2.6-2.6M16.8 13.8l-1.6-1.6"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Benefit: 4 Core AI Modules
 * - Interconnected 4-quadrant neural matrix
 */
export const BenefitModulesIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect
      x="3.5"
      y="3.5"
      width="6.5"
      height="6.5"
      rx="1.8"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <rect
      x="14"
      y="3.5"
      width="6.5"
      height="6.5"
      rx="1.8"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <rect
      x="3.5"
      y="14"
      width="6.5"
      height="6.5"
      rx="1.8"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <rect
      x="14"
      y="14"
      width="6.5"
      height="6.5"
      rx="1.8"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {/* Micro-connecting bus lines */}
    <line x1="10" y1="6.75" x2="14" y2="6.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="10" y1="17.25" x2="14" y2="17.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="6.75" y1="10" x2="6.75" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="17.25" y1="10" x2="17.25" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    {/* Central processor node */}
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Quick Launch Accelerator Icon
 * - Replaces generic cartoon rocket with high-velocity hypersonic flight vector
 */
export const QuickLaunchSpeedIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M4.5 17L12 3.5l7.5 13.5-7.5-4.2-7.5 4.2z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="12" y1="12.8" x2="12" y2="20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="7.5" y1="17.5" x2="5" y2="20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="16.5" y1="17.5" x2="19" y2="20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Interactive Demo Icon
 * - Sleek presentation aperture with refined play vector
 */
export const InteractiveDemoIcon: React.FC<IconProps> = ({ size = 20, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <polygon
      points="10,8.5 16,12 10,15.5"
      fill="currentColor"
    />
  </svg>
);

/**
 * Refined Arrow Right
 * - Clean directional chevron with balanced proportions
 */
export const RefinedArrowRight: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Top Navbar & Dock Icons with Unified Geometry
 */

export const NavHomeIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5a1 1 0 0 1-1-1v-4.5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1V20.5a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20V9.5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const NavFeaturesIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const NavLearningIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 12v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5v-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const NavCareerIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="2.5" y="7" width="19" height="13.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M2.5 12h19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <rect x="10.5" y="10.5" width="3" height="3" rx="0.75" fill="currentColor" />
  </svg>
);

export const NavAboutIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="7.75" r="1.1" fill="currentColor" />
  </svg>
);

export const BottomBellIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BottomSettingsIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BottomHelpIcon: React.FC<IconProps> = ({ size = 16, className = "", ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
  </svg>
);


