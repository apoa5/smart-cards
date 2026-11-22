import { Link } from "react-router-dom";
import { ArrowUpRightIcon, BookOpenIcon } from "@heroicons/react/24/outline";

export default function EditorialHeader({ landing = false }) {
  return (
    <header className="editorial-header">
      <div className="editorial-shell editorial-header-inner">
        <Link to="/" className="editorial-wordmark">
          <BookOpenIcon aria-hidden="true" />
          SmartCards
        </Link>
        {landing && (
          <nav aria-label="Explore SmartCards" className="editorial-header-nav">
            <a href="#how-it-works">How it works</a>
            <Link to="/dashboard" className="editorial-header-cta">
              Start studying <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
