import { ThemeToggle } from './components/ThemeToggle.js';
import { ParticipantForm } from './components/ParticipantForm.js';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>
      <ParticipantForm />
      {/* ParticipantTable added in Task 9 */}
    </div>
  );
}
