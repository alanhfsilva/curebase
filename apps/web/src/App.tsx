import { ThemeToggle } from './components/ThemeToggle.js';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Clinical Trial Participant Capture</h1>
        <ThemeToggle />
      </header>
      {/* ParticipantForm and ParticipantTable added in Tasks 8 and 9 */}
    </div>
  );
}
