'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from '../app/Home.module.css';

const FAQs = [
  {
    question: 'Who are the instructors at Upgrade Skills?',
    answer: 'Our mentors are verified industry experts hailing from premium institutes like IIT, IIM, NIFT and leading global brands like Raymond, ITC, Reliance, and Cognizant. They bring practical, hands-on experience to our masterclasses.',
  },
  {
    question: 'How do national design challenges (InnoTechXperience) work?',
    answer: 'Students can participate in live photography, logo design, or web building challenges. Once you join a challenge, you submit your project link and screenshots. Our instructors grade the submissions, and top scorers earn cash prizes, national recognition, and verified certificates.',
  },
  {
    question: 'Are the course completion certificates verified?',
    answer: 'Yes! Every certificate issued contains a unique verification hash generated via our secure backend database. Employers, universities, and partners can check and authenticate your achievements on our platform.',
  },
  {
    question: 'Is the payment gateway secure?',
    answer: 'Absolutely. We utilize Razorpay’s secure checkout environment (Sandbox Mode for staging, standard TLS encryption for production) supporting UPI, Cards, NetBanking, and Wallets. Payments are verified on our server before enrollment is activated.',
  },
  {
    question: 'Can I ask questions if I get stuck in a lecture?',
    answer: 'Yes! Every lecture page contains a dynamic Q&A Discussion board tab where students post questions. Our instructors and administrators are notified and reply directly, with their names highlighted by official role badges.',
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={styles.faqWrapper}>
      {FAQs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`}>
            <button onClick={() => toggleFAQ(index)} className={styles.faqHeader}>
              <span className={styles.faqQuestion}>{faq.question}</span>
              <ChevronDown size={18} className={`${styles.faqChevron} ${isOpen ? styles.faqChevronRotate : ''}`} />
            </button>
            <div className={`${styles.faqAnswerWrapper} ${isOpen ? styles.faqAnswerOpen : ''}`}>
              <div className={styles.faqAnswer}>
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
