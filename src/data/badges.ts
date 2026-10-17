import { Badge } from '../types';

export const ALL_BADGES: Badge[] = [
  {
    id: 'quiz-starter',
    name: 'Quiz Starter',
    description: 'Completed your very first quiz on Quiz Battle.',
    icon: 'Sparkles',
    category: 'achievement',
    requirement: 'Play 1 quiz game'
  },
  {
    id: 'first-victory',
    name: 'First Victory',
    description: 'Claimed your first victory with high accuracy in battle mode.',
    icon: 'Trophy',
    category: 'achievement',
    requirement: 'Win 1 quiz battle with ≥70% score'
  },
  {
    id: 'maths-master',
    name: 'Maths Master',
    description: 'Demonstrated superior mastery in Mathematics and Add Maths.',
    icon: 'Calculator',
    category: 'subject',
    requirement: 'Answer 15 Maths questions correctly'
  },
  {
    id: 'science-master',
    name: 'Science Master',
    description: 'Conquered physics, chemistry, and biology challenges.',
    icon: 'Zap',
    category: 'subject',
    requirement: 'Answer 20 Science questions correctly'
  },
  {
    id: 'computing-wizard',
    name: 'Computing Wizard',
    description: 'Cracked advanced algorithms and architecture on Hard mode.',
    icon: 'Cpu',
    category: 'subject',
    requirement: 'Complete Computing on Hard difficulty'
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Answered a question correctly in under 3 seconds.',
    icon: 'Flame',
    category: 'skill',
    requirement: 'Answer correctly with ≥12 seconds left on timer'
  },
  {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Achieved an unbroken streak of 5 correct answers in a row.',
    icon: 'Target',
    category: 'skill',
    requirement: 'Reach a streak of 5 correct answers'
  },
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieved 100% accuracy in a quiz with at least 5 questions.',
    icon: 'Crown',
    category: 'skill',
    requirement: 'Finish a quiz with 100% correct answers'
  },
  {
    id: 'ten-wins',
    name: '10 Wins',
    description: 'Conquered 10 quiz battles in your academic journey.',
    icon: 'Medal',
    category: 'achievement',
    requirement: 'Win 10 quiz battles'
  },
  {
    id: 'scholars-ascent',
    name: "Scholar's Ascent",
    description: 'Climbed the ranks and advanced to Level 5.',
    icon: 'GraduationCap',
    category: 'achievement',
    requirement: 'Reach Level 5'
  }
];
