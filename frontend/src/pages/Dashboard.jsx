import EditorialHeader from "../components/EditorialHeader";
import FileUploader from "../components/FileUploader";

export default function Dashboard() {
  return (
    <>
      <EditorialHeader />
      <main className="editorial-shell editorial-workspace" id="main-content">
        <header className="editorial-workspace-heading">
          <h1 className="editorial-section-title">Generate Flashcards and Quizzes</h1>
          <p>Upload a document, then choose how to practice.</p>
        </header>
        <FileUploader />
      </main>
    </>
  );
}
