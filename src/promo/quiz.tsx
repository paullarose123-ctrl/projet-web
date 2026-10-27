import { DURATION, QuizPromo, quizIndex, quizNumber, scheduleQuiz } from './QuizPromo';
import { mountPromo } from './mount';

// Page de la série « Qui est le plus… ? » (seulement en développement : promo/quiz.html?q=0 … ?q=9, et &n=2 pour afficher « 2/10 »).
const index = quizIndex();
const number = quizNumber(index);
mountPromo({ duration: DURATION, render: (t) => <QuizPromo t={t} index={index} number={number} />, music: scheduleQuiz });
