import FileUploader from "../components/FileUploader";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="flex justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="text-xl font-bold flex-shrink-0">SmartCards</div>
      </header>

      <main className="text-center pt-10 px-6">
        <h1 className="text-3xl sm:text-5xl font-serif text-semibold leading-tight mb-10">
          Generate Flashcards and Quizzes
        </h1>
        <div>
          <FileUploader />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
