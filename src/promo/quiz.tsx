import { DURATION, QuizPromo, quizIndex, scheduleQuiz } from './QuizPromo';
import { mountPromo } from './mount';

// Page de la série « Qui est le plus… ? » (seulement en développement : promo/quiz.html?q=0 … ?q=9).
const index = quizIndex();
mountPromo({ duration: DURATION, render: (t) => <QuizPromo t={t} index={index} />, music: scheduleQuiz });
