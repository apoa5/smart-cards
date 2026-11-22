import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import EditorialHeader from "../components/EditorialHeader";

const steps = [
  { title: "Upload your notes", detail: "Choose a TXT, PDF, DOCX, or PPTX file up to 4 MB." },
  { title: "Choose a format", detail: "Generate 5, 10, or 15 flashcards or multiple-choice questions." },
  { title: "Review and practice", detail: "Reveal answers at your own pace or check your understanding with a quiz." },
];

export default function LandingPage() {
  return (
    <>
      <EditorialHeader landing />
      <main id="main-content">
        <section className="editorial-shell editorial-hero" aria-labelledby="hero-title">
          <div>
            <h1 id="hero-title" className="editorial-title">
              A better way to study <em>what matters.</em>
            </h1>
            <p className="editorial-intro">
              Turn a document into flashcards or a practice quiz. Upload your notes and start reviewing without an account.
            </p>
            <div className="editorial-hero-actions">
              <Link to="/dashboard" className="editorial-button">
                Get started <ArrowRightIcon aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="editorial-text-link">How it works</a>
            </div>
          </div>
          <div className="editorial-illustration" aria-hidden="true">
            <div className="editorial-sample-document">
              <span className="editorial-label">Study notes</span>
              <span className="editorial-sample-title">Ecology</span>
              <span className="editorial-sample-rules" />
            </div>
            <div className="editorial-sample-card">
              <span className="editorial-label">Flashcard</span>
              <span className="editorial-sample-question">What do decomposers do?</span>
              <span className="editorial-sample-answer">They break down organic matter and help recycle nutrients.</span>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="editorial-shell editorial-section">
          <h2 className="editorial-section-title">How it works</h2>
          <ol className="editorial-steps">
            {steps.map(({ title, detail }, index) => (
              <li key={title}>
                <span aria-hidden="true" className="editorial-step-number">{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="benefits" className="editorial-practice">
          <div className="editorial-shell editorial-practice-inner">
            <div>
              <h2 className="editorial-section-title">Two ways to practice.</h2>
              <Link to="/dashboard" className="editorial-text-link">
                Start studying <ArrowRightIcon aria-hidden="true" />
              </Link>
            </div>
            <div id="why-choose-us" className="editorial-practice-list">
              <div>
                <h3>Flashcards</h3>
                <p>Try to recall the answer before turning over each card. Use focus mode to review one card at a time.</p>
              </div>
              <div>
                <h3>Quizzes</h3>
                <p>Choose from four answers and get immediate feedback. Review your score at the end.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer id="contact-us" className="editorial-shell editorial-footer">
        <span className="editorial-footer-brand">SmartCards</span>
        <p>Check AI-generated answers against your source material.</p>
        <a href="https://github.com/apoa5" target="_blank" rel="noopener noreferrer" className="editorial-text-link">
          Contact on GitHub
        </a>
      </footer>
    </>
  );
}
