import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  RotateCcw, 
  ArrowLeft, 
  Check, 
  X, 
  BookOpen, 
  Filter, 
  Save,
  CheckCircle2
} from 'lucide-react';
import { Difficulty, Question, Subject } from '../../types';
import { SUBJECTS } from '../../data/defaultQuestions';
import { loadAllQuestions, saveAllQuestions, resetQuestionsToDefault } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';

interface AdminViewProps {
  onBack: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onBack }) => {
  const [questions, setQuestions] = useState<Question[]>(() => loadAllQuestions());
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<Omit<Question, 'id'>>({
    subject: 'Mathematics',
    difficulty: 'medium',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAdd = () => {
    soundEffects.playClick();
    setEditingId(null);
    setFormData({
      subject: (filterSubject !== 'all' ? filterSubject : 'Mathematics') as Subject,
      difficulty: (filterDifficulty !== 'all' ? filterDifficulty : 'medium') as Difficulty,
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
    soundEffects.playClick();
    setEditingId(q.id);
    setFormData({
      subject: q.subject,
      difficulty: q.difficulty,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    });
    setIsFormOpen(true);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleDelete = (id: string) => {
    soundEffects.playClick();
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    saveAllQuestions(updated);
    setConfirmDeleteId(null);
    showNotification('Question deleted successfully.');
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playClick();

    if (editingId) {
      // Edit existing
      const updated = questions.map((q) =>
        q.id === editingId ? { ...formData, id: editingId } : q
      );
      setQuestions(updated);
      saveAllQuestions(updated);
      showNotification('Question updated successfully.');
    } else {
      // Add new
      const newQuestion: Question = {
        ...formData,
        id: 'custom-' + Date.now(),
      };
      const updated = [newQuestion, ...questions];
      setQuestions(updated);
      saveAllQuestions(updated);
      showNotification('New question added to curriculum.');
    }

    setIsFormOpen(false);
  };

  const handleResetToDefaults = () => {
    soundEffects.playClick();
    const reset = resetQuestionsToDefault();
    setQuestions(reset);
    setConfirmResetOpen(false);
    showNotification('Repository reset to standard 88 questions.');
  };

  // Filter & Search
  const filteredQuestions = questions.filter((q) => {
    if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchQ = q.question.toLowerCase().includes(query);
      const matchExpl = q.explanation.toLowerCase().includes(query);
      if (!matchQ && !matchExpl) return false;
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              soundEffects.playClick();
              onBack();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Curriculum & Question Management
            </h1>
            <p className="text-xs text-slate-400">
              Administer senior high school benchmarks ({questions.length} total active questions)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {confirmResetOpen ? (
            <div className="flex items-center gap-1.5 bg-rose-950/60 p-1 rounded-xl border border-rose-500/40">
              <span className="text-[11px] text-rose-200 px-2 font-bold">Reset to 88 questions?</span>
              <button
                onClick={handleResetToDefaults}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmResetOpen(true)}
              title="Reset to default 88 curriculum questions"
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {notification}
        </div>
      )}

      {/* Filters & Search Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions or terms..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 font-medium"
          >
            <option value="all">All Subjects ({questions.length})</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({questions.filter((q) => q.subject === s.id).length})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 capitalize font-medium"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
          <span>Showing {filteredQuestions.length} of {questions.length} questions</span>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-sm">
            No questions match your filter. Try adjusting your search query or subject filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {q.subject}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {q.difficulty}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">{q.question}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                      title="Edit question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === q.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/80 p-1 rounded-lg border border-rose-500/50">
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="px-2 py-1 rounded bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(q.id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Answer Choices Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div
                      key={opt}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        q.correctAnswer === opt
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-semibold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                      }`}
                    >
                      <span className="font-bold shrink-0">{opt}:</span>
                      <span className="truncate">{q[`option${opt}` as keyof Question]}</span>
                      {q.correctAnswer === opt && (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 ml-auto shrink-0">
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <strong className="text-slate-300">Explanation:</strong> {q.explanation}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">
              {editingId ? 'Edit Curriculum Question' : 'Add New Curriculum Question'}
            </h2>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value as Subject })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500 capitalize"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Question Prompt</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={2}
                  required
                  placeholder="e.g. In chemistry, what is the oxidation state of..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Option A</label>
                  <input
                    type="text"
                    value={formData.optionA}
                    onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Option B</label>
                  <input
                    type="text"
                    value={formData.optionB}
                    onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Option C</label>
                  <input
                    type="text"
                    value={formData.optionC}
                    onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 uppercase block mb-1">Option D</label>
                  <input
                    type="text"
                    value={formData.optionD}
                    onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Correct Answer</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, correctAnswer: opt })}
                      className={`py-2 rounded-xl font-bold border transition ${
                        formData.correctAnswer === opt
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Option {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 uppercase block mb-1">Standard Explanation</label>
                <textarea
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  rows={2}
                  required
                  placeholder="Explain why the answer is correct for student review..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" /> Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
