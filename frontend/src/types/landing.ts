export interface FeatureCardItem {
  id: 'chat' | 'voice' | 'interview' | 'coding' | 'career';
  title: string;
  shortDesc: string;
  fullDesc: string;
  badge: string;
  image: string;
  accentColor: string;
  gradient: string;
  routePath: string;
  keyFeatures: string[];
}
